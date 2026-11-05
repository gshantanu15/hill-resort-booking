import "server-only";
import { createHash } from "node:crypto";
import { eq, sql } from "drizzle-orm";
import { z } from "zod";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import * as schema from "../db/schema";
import { BookingError, createQuote } from "./booking";
import { bookingSelectionSchema } from "./booking-validation";
import { getStaffEnquiry } from "./enquiries";

type Database = Pick<PostgresJsDatabase<typeof schema>, "transaction">;
const inputSchema = z
  .object({
    selection: bookingSelectionSchema,
    expectedDraft: z.string().max(6000),
  })
  .strict();
const money = (paise: number) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(
    paise / 100,
  );
const dateTime = (value: string) =>
  new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Kolkata",
  }).format(new Date(value));

export async function insertEnquiryRoomQuote(
  db: Database,
  id: string,
  raw: unknown,
  options: { secret: string; now?: Date },
) {
  if (!z.uuid().safeParse(id).success)
    throw new BookingError(
      "INVALID_REFERENCE",
      "Choose a valid enquiry reference.",
    );
  const parsed = inputSchema.safeParse(raw);
  if (!parsed.success)
    throw new BookingError(
      "INVALID_QUOTE",
      "Confirm exact stay dates, room quantities and guest allocations.",
    );
  const input = parsed.data;
  const fingerprint = createHash("sha256")
    .update(JSON.stringify(input))
    .digest("hex");
  const existing = await db.transaction(
    async (tx) => {
      const [row] = await tx
        .select({
          draft: schema.enquiries.draft,
          pricing: schema.enquiries.pricing,
        })
        .from(schema.enquiries)
        .where(eq(schema.enquiries.id, id));
      return row;
    },
    { accessMode: "read only" },
  );
  if (!existing)
    throw new BookingError(
      "ENQUIRY_NOT_FOUND",
      "This enquiry could not be found.",
      404,
    );
  if (
    existing.pricing?.fingerprint === fingerprint &&
    existing.draft === existing.pricing.resultingDraft
  )
    return getStaffEnquiry(db, id);
  if (existing.draft !== input.expectedDraft)
    throw new BookingError(
      "ENQUIRY_EDIT_CONFLICT",
      "The saved draft changed. Reload it before adding a room quote.",
      409,
    );
  const quote = await createQuote(db, input.selection, options);
  const checkedAt = (options.now ?? new Date()).toISOString();
  const accommodation = input.selection.items
    .map(
      (item) =>
        `${item.quantity} × ${quote.nights.find((night) => night.roomTypeId === item.roomTypeId)?.roomTypeName}`,
    )
    .join(", ");
  const block = `[Accommodation quote]\n${accommodation}\nCheck-in: ${input.selection.checkIn}\nCheck-out: ${input.selection.checkOut}\nAccommodation total: ${money(quote.totalPaise)} (includes GST of ${money(quote.taxPaise)})\nChecked ${dateTime(checkedAt)} IST; quote valid until ${dateTime(quote.expiresAt)} IST. Subject to availability at booking confirmation.\n[/Accommodation quote]`;
  await db.transaction(async (tx) => {
    const [current] = await tx
      .select()
      .from(schema.enquiries)
      .where(eq(schema.enquiries.id, id))
      .for("update");
    if (!current)
      throw new BookingError(
        "ENQUIRY_NOT_FOUND",
        "This enquiry could not be found.",
        404,
      );
    if (
      current.pricing?.fingerprint === fingerprint &&
      current.draft === current.pricing.resultingDraft
    )
      return;
    if (current.draft !== input.expectedDraft)
      throw new BookingError(
        "ENQUIRY_EDIT_CONFLICT",
        "The saved draft changed. Your edits are safe; reload before inserting a quote.",
        409,
      );
    let draft: string;
    if (current.pricing?.block && current.draft.includes(current.pricing.block))
      draft = current.draft.replace(current.pricing.block, block);
    else {
      if (current.draft.includes("[Accommodation quote]"))
        throw new BookingError(
          "QUOTE_EDIT_CONFLICT",
          "The existing room quote has staff edits. Remove that quote block before inserting a new one.",
          409,
        );
      const base =
        current.draft ||
        (current.category === "wedding" || current.category === "offsite"
          ? "[Sales-approved quote]"
          : "");
      const slot = /\[Reservations:\s*insert checked accommodation[^\]]*\]/i;
      const closing = base.search(
        /(?:^|\n)(?:Warm regards|Kind regards|Best regards|Regards|Sincerely),?\s*\n/i,
      );
      draft = slot.test(base)
        ? base.replace(slot, block)
        : closing >= 0
          ? `${base.slice(0, closing).trimEnd()}\n\n${block}\n\n${base.slice(closing).trimStart()}`
          : [base, block].filter(Boolean).join("\n\n");
    }
    if (draft.length > 6000)
      throw new BookingError(
        "DRAFT_TOO_LONG",
        "Shorten the saved draft before inserting this room quote.",
      );
    await tx
      .update(schema.enquiries)
      .set({
        draft,
        draftEdited: true,
        draftRevision: sql`${schema.enquiries.draftRevision} + 1`,
        pricing: {
          totalPaise: quote.totalPaise,
          subtotalPaise: quote.subtotalPaise,
          taxPaise: quote.taxPaise,
          checkedAt,
          expiresAt: quote.expiresAt,
          selection: quote.selection,
          fingerprint,
          resultingDraft: draft,
          block,
        },
      })
      .where(eq(schema.enquiries.id, id));
  });
  return getStaffEnquiry(db, id);
}
