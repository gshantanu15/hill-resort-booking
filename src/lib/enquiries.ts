import "server-only";
import { createHash } from "node:crypto";
import { eq, gte, sql } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import * as schema from "../db/schema";
import { enquiryInputSchema } from "./enquiry-validation";
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
  const fingerprint = createHash("sha256")
    .update(JSON.stringify({ contact: input.contact, message: input.message }))
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
      if (existing.requestFingerprint !== fingerprint)
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
