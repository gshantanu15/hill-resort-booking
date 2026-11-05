import "server-only";
import { createHash } from "node:crypto";
import { and, desc, eq, gte, isNull, sql } from "drizzle-orm";
import { z } from "zod";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import * as schema from "../db/schema";
import {
  enquiryInputSchema,
  simulatedEnquiryInputSchema,
  enquiryListSchema,
  enquiryUpdateSchema,
  defaultEnquiryOwner,
} from "./enquiry-validation";
import { BookingError } from "./booking";

type Database = Pick<PostgresJsDatabase<typeof schema>, "transaction">;

export async function saveWebsiteEnquiry(db: Database, raw: unknown) {
  const parsed = enquiryInputSchema.safeParse(raw);
  if (!parsed.success)
    throw new BookingError(
      "INVALID_ENQUIRY",
      parsed.error.issues[0]?.message ?? "Check your enquiry details.",
    );
  const input = parsed.data;
  return saveEnquiry(db, input, "website");
}

export async function updateStaffEnquiry(
  db: Database,
  id: string,
  raw: unknown,
) {
  if (!z.uuid().safeParse(id).success)
    throw new BookingError(
      "INVALID_REFERENCE",
      "Choose a valid enquiry reference.",
    );
  const parsed = enquiryUpdateSchema.safeParse(raw);
  if (!parsed.success)
    throw new BookingError(
      "INVALID_ENQUIRY_EDIT",
      parsed.error.issues[0]?.message ?? "Check your changes.",
    );
  const input = parsed.data;
  return db.transaction(async (tx) => {
    await tx.execute(sql`set local lock_timeout = '5s'`);
    await tx.execute(sql`set local statement_timeout = '10s'`);
    const t = schema.enquiries;
    const [current] = await tx
      .select({
        category: t.category,
        owner: t.owner,
        needsReview: t.needsReview,
        gmAttention: t.gmAttention,
        draft: t.draft,
      })
      .from(t)
      .where(eq(t.id, id))
      .for("update");
    if (!current)
      throw new BookingError(
        "ENQUIRY_NOT_FOUND",
        "This enquiry could not be found.",
        404,
      );
    let changes: Partial<typeof current>;
    let stale: boolean;
    let alreadySaved: boolean;
    if (input.action === "draft") {
      changes = { draft: input.draft };
      stale = current.draft !== input.expectedDraft;
      alreadySaved = current.draft === input.draft;
    } else {
      const owner =
        input.owner !== undefined
          ? input.owner
          : input.category !== input.expected.category
            ? defaultEnquiryOwner(input.category)
            : input.expected.owner;
      const attention =
        input.category === "complaint" || input.category === "unsorted";
      changes = {
        category: input.category,
        owner,
        needsReview: attention,
        gmAttention: attention,
      };
      stale =
        current.category !== input.expected.category ||
        current.owner !== input.expected.owner;
      alreadySaved =
        current.category === input.category && current.owner === owner;
    }
    if (stale && !alreadySaved)
      throw new BookingError(
        "ENQUIRY_EDIT_CONFLICT",
        "Another staff session changed this enquiry. Your edits are kept here; reload the saved version before trying again.",
        409,
      );
    if (alreadySaved && stale) return current;
    const [saved] = await tx
      .update(t)
      .set(changes)
      .where(eq(t.id, id))
      .returning({
        category: t.category,
        owner: t.owner,
        needsReview: t.needsReview,
        gmAttention: t.gmAttention,
        draft: t.draft,
      });
    return saved;
  });
}

export async function saveSimulatedEnquiry(db: Database, raw: unknown) {
  const parsed = simulatedEnquiryInputSchema.safeParse(raw);
  if (!parsed.success)
    throw new BookingError(
      "INVALID_ENQUIRY",
      parsed.error.issues[0]?.message ?? "Check the enquiry details.",
    );
  return saveEnquiry(db, parsed.data, parsed.data.source);
}

async function saveEnquiry(
  db: Database,
  input: z.infer<typeof enquiryInputSchema>,
  source: "website" | "email" | "whatsapp",
) {
  const fingerprint = createHash("sha256")
    .update(
      JSON.stringify({
        contact: input.contact,
        message: input.message,
        ...(source === "website" ? {} : { source }),
      }),
    )
    .digest("hex");
  return db.transaction(async (tx) => {
    await tx.execute(sql`set local lock_timeout = '5s'`);
    await tx.execute(sql`set local statement_timeout = '10s'`);
    await tx.execute(
      sql`select pg_advisory_xact_lock(hashtextextended(${"enquiry:" + input.submissionId}, 0))`,
    );
    const [existing] = await tx
      .select()
      .from(schema.enquiries)
      .where(eq(schema.enquiries.submissionId, input.submissionId));
    if (existing) {
      if (
        existing.source !== source ||
        existing.requestFingerprint !== fingerprint
      )
        throw new BookingError(
          "SUBMISSION_CONFLICT",
          "This submission was already used. Start a new enquiry.",
          409,
        );
      return { reference: existing.id, duplicate: true };
    }
    // Serialize intake limits across server instances; retry lookups consume no allowance.
    await tx.execute(
      sql`select pg_advisory_xact_lock(hashtextextended('enquiry:website-intake', 0))`,
    );
    const [clock] = await tx.execute<{ start: string }>(
      sql`select date_trunc('hour', clock_timestamp())::text as start`,
    );
    const [usage] = await tx
      .select({
        total: sql<number>`count(*)::int`,
        email: sql<number>`count(*) filter (where ${schema.enquiries.contactEmail} = ${input.contact.email})::int`,
      })
      .from(schema.enquiries)
      .where(gte(schema.enquiries.createdAt, new Date(clock.start)));
    if (usage.total >= 100 || usage.email >= 5)
      throw new BookingError(
        "ENQUIRY_LIMIT",
        "Too many enquiries. Please try again after the next hour begins.",
        429,
      );
    const [saved] = await tx
      .insert(schema.enquiries)
      .values({
        submissionId: input.submissionId,
        source,
        requestFingerprint: fingerprint,
        contactName: input.contact.name,
        contactEmail: input.contact.email,
        contactPhone: input.contact.phone,
        message: input.message,
        createdAt: sql`clock_timestamp()`,
      })
      .returning({ reference: schema.enquiries.id });
    return { ...saved, duplicate: false };
  });
}

export async function listStaffEnquiries(db: Database, raw: unknown) {
  const parsed = enquiryListSchema.safeParse(raw);
  if (!parsed.success)
    throw new BookingError(
      "INVALID_FILTER",
      "Choose valid enquiry filters and a page between 1 and 10,000.",
    );
  const filters = parsed.data;
  const t = schema.enquiries;
  const where = and(
    filters.source ? eq(t.source, filters.source) : undefined,
    filters.category ? eq(t.category, filters.category) : undefined,
    filters.owner === "unassigned"
      ? isNull(t.owner)
      : filters.owner
        ? eq(t.owner, filters.owner)
        : undefined,
    filters.review ? eq(t.needsReview, true) : undefined,
    filters.attention ? eq(t.gmAttention, true) : undefined,
  );
  return db.transaction(
    async (tx) => {
      const rows = await tx
        .select({
          id: t.id,
          contactName: t.contactName,
          source: t.source,
          category: t.category,
          owner: t.owner,
          needsReview: t.needsReview,
          gmAttention: t.gmAttention,
          processingState: t.processingState,
          createdAt: t.createdAt,
          preview: sql<string>`left(${t.message}, 160)`,
        })
        .from(t)
        .where(where)
        .orderBy(desc(t.createdAt), desc(t.id))
        .limit(25)
        .offset((filters.page - 1) * 25);
      const [count] = await tx
        .select({ total: sql<number>`count(*)::int` })
        .from(t)
        .where(where);
      return { rows, total: count.total, page: filters.page, pageSize: 25 };
    },
    { isolationLevel: "repeatable read", accessMode: "read only" },
  );
}

export async function getStaffEnquiry(db: Database, id: string) {
  if (!z.uuid().safeParse(id).success)
    throw new BookingError(
      "INVALID_REFERENCE",
      "Choose a valid enquiry reference.",
    );
  return db.transaction(
    async (tx) => {
      const t = schema.enquiries;
      const [row] = await tx
        .select({
          id: t.id,
          source: t.source,
          contact: {
            name: t.contactName,
            email: t.contactEmail,
            phone: t.contactPhone,
          },
          message: t.message,
          category: t.category,
          owner: t.owner,
          needsReview: t.needsReview,
          gmAttention: t.gmAttention,
          processingState: t.processingState,
          draft: t.draft,
          createdAt: t.createdAt,
        })
        .from(t)
        .where(eq(t.id, id));
      if (!row)
        throw new BookingError(
          "ENQUIRY_NOT_FOUND",
          "This enquiry could not be found.",
          404,
        );
      return { ...row, extracted: null };
    },
    { accessMode: "read only" },
  );
}
