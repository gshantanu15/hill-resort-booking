import "server-only";
import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import { and, eq, gte, inArray, lt, sql } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { z } from "zod";
import * as schema from "../db/schema";
import {
  bookingSelectionSchema,
  validateOccupancy,
  validateSelection,
  validateStay,
  type BookingSelection,
} from "./booking-validation";
import { splitInclusiveNight } from "./booking-tax";
import { contactSchema as validContactSchema } from "./booking-contact";
import { acceptanceSchema, isCurrentAcceptance } from "./booking-acceptance";

type Database = Pick<PostgresJsDatabase<typeof schema>, "transaction">;
type Transaction = Parameters<
  Parameters<PostgresJsDatabase<typeof schema>["transaction"]>[0]
>[0];
type Options = { now?: Date; secret: string };
const PLAN = "standard-stay";
const contactSchema = z
  .object({
    name: z.string().trim().min(1).max(120),
    email: z
      .string()
      .trim()
      .email()
      .max(254)
      .transform((value) => value.toLowerCase()),
    phone: z
      .string()
      .trim()
      .max(32)
      .optional()
      .transform((value) => value || undefined),
  })
  .strict();
const confirmationSchema = z
  .object({
    selection: bookingSelectionSchema,
    contact: contactSchema,
    submissionId: z.uuid(),
    quoteToken: z.string().min(20).max(2000),
    paymentOutcome: z.enum(["success", "failure"]),
    acceptance: acceptanceSchema.optional(),
  })
  .strict();
type Night = ReturnType<typeof splitInclusiveNight> & {
  roomTypeId: string;
  roomTypeName: string;
  stayDate: string;
  quantity: number;
};
export type Quote = {
  selection: BookingSelection;
  ratePlanId: string;
  ratePlanName: string;
  nights: Night[];
  subtotalPaise: number;
  taxPaise: number;
  totalPaise: number;
  hash: string;
  token: string;
  expiresAt: string;
  currency: "INR";
};

export class BookingError extends Error {
  constructor(
    public code: string,
    message: string,
    public status = 400,
    public updatedQuote?: Quote,
  ) {
    super(message);
  }
}
const digest = (value: unknown) =>
  createHash("sha256").update(JSON.stringify(value)).digest("hex");
const canonical = (selection: BookingSelection): BookingSelection => ({
  ...selection,
  items: [...selection.items].sort((a, b) =>
    a.roomTypeId.localeCompare(b.roomTypeId),
  ),
});

function totals(
  nights: { subtotalPaise: number; taxPaise: number; totalPaise: number }[],
) {
  const result = nights.reduce(
    (sum, row) => ({
      subtotalPaise: sum.subtotalPaise + row.subtotalPaise,
      taxPaise: sum.taxPaise + row.taxPaise,
      totalPaise: sum.totalPaise + row.totalPaise,
    }),
    { subtotalPaise: 0, taxPaise: 0, totalPaise: 0 },
  );
  if (Object.values(result).some((value) => !Number.isSafeInteger(value)))
    throw new BookingError(
      "AMOUNT_RANGE",
      "The stay total exceeds the supported range.",
    );
  return result;
}
function signature(body: string, secret: string) {
  if (secret.length < 32)
    throw new Error("A secure booking quote secret is required.");
  return createHmac("sha256", secret)
    .update(`aavana-quote-v1:${body}`)
    .digest("base64url");
}
function tokenPayload(token: string, secret: string) {
  try {
    const [body, supplied, extra] = token.split(".");
    if (!body || !supplied || extra) throw new Error();
    const expected = Buffer.from(signature(body, secret));
    const received = Buffer.from(supplied);
    if (
      expected.length !== received.length ||
      !timingSafeEqual(expected, received)
    )
      throw new Error();
    const payload = JSON.parse(Buffer.from(body, "base64url").toString("utf8"));
    return z
      .object({
        hash: z.string().regex(/^[0-9a-f]{64}$/),
        expiresAt: z.number().int().positive(),
      })
      .strict()
      .parse(payload);
  } catch {
    throw new BookingError(
      "INVALID_QUOTE",
      "Request a fresh quote before confirming.",
    );
  }
}
function issueQuote(
  data: Omit<Quote, "token" | "expiresAt">,
  options: Options,
): Quote {
  const expiresAt = (options.now ?? new Date()).getTime() + 15 * 60000;
  const body = Buffer.from(
    JSON.stringify({ hash: data.hash, expiresAt }),
  ).toString("base64url");
  return {
    ...data,
    token: `${body}.${signature(body, options.secret)}`,
    expiresAt: new Date(expiresAt).toISOString(),
  };
}
function validSelection(input: unknown, now?: Date) {
  try {
    return canonical(validateSelection(input, now));
  } catch (error) {
    throw new BookingError(
      "INVALID_SELECTION",
      error instanceof z.ZodError
        ? error.issues.map((issue) => issue.message).join("; ")
        : error instanceof Error
          ? error.message
          : "Invalid selection.",
    );
  }
}

async function availabilityRows(
  tx: Transaction,
  checkIn: string,
  checkOut: string,
  lock = false,
  ids?: string[],
) {
  const rooms = await tx
    .select()
    .from(schema.roomTypes)
    .orderBy(schema.roomTypes.id);
  const condition = and(
    gte(schema.nightlyInventory.stayDate, checkIn),
    lt(schema.nightlyInventory.stayDate, checkOut),
    ids ? inArray(schema.nightlyInventory.roomTypeId, ids) : undefined,
  );
  const query = tx
    .select()
    .from(schema.nightlyInventory)
    .where(condition)
    .orderBy(
      schema.nightlyInventory.roomTypeId,
      schema.nightlyInventory.stayDate,
    );
  const inventory = lock ? await query.for("update") : await query;
  return { rooms, inventory };
}

export async function getAvailability(
  db: Database,
  input: { checkIn: string; checkOut: string },
  options: { now?: Date } = {},
) {
  let nights: string[];
  try {
    nights = validateStay(input.checkIn, input.checkOut, options.now);
  } catch (error) {
    throw new BookingError(
      "INVALID_DATES",
      error instanceof Error ? error.message : "Invalid dates.",
    );
  }
  return db.transaction(
    async (tx) => {
      const { rooms, inventory } = await availabilityRows(
        tx,
        input.checkIn,
        input.checkOut,
      );
      const rates = await tx
        .select()
        .from(schema.nightlyRates)
        .where(
          and(
            eq(schema.nightlyRates.ratePlanId, PLAN),
            gte(schema.nightlyRates.stayDate, input.checkIn),
            lt(schema.nightlyRates.stayDate, input.checkOut),
          ),
        );
      return {
        ...input,
        nights,
        rooms: rooms.map((room) => {
          const rows = inventory.filter((row) => row.roomTypeId === room.id);
          const missing = rows.length !== nights.length;
          const missingPrice =
            rates.filter((rate) => rate.roomTypeId === room.id).length !==
            nights.length;
          const closed = rows.some((row) => row.blackout);
          const available =
            missing || missingPrice || closed
              ? 0
              : Math.min(...rows.map((row) => row.allotment - row.booked));
          return {
            roomTypeId: room.id,
            name: room.name,
            capacity: room.capacity,
            available,
            reason: missing
              ? "Inventory is not configured for every night."
              : missingPrice
                ? "Price unavailable for one or more nights."
                : closed
                  ? "Blackout dates stop new bookings."
                  : available === 0
                    ? "Sold out for one or more nights."
                    : null,
          };
        }),
      };
    },
    { isolationLevel: "repeatable read", accessMode: "read only" },
  );
}

async function quoteInTransaction(
  tx: Transaction,
  selection: BookingSelection,
  options: Options,
  lock = false,
): Promise<Quote> {
  const dates = validateStay(
    selection.checkIn,
    selection.checkOut,
    options.now,
  );
  const ids = selection.items.map((item) => item.roomTypeId);
  const { rooms, inventory } = await availabilityRows(
    tx,
    selection.checkIn,
    selection.checkOut,
    lock,
    ids,
  );
  try {
    validateOccupancy(selection, rooms);
  } catch (error) {
    throw new BookingError(
      "INVALID_OCCUPANCY",
      error instanceof Error ? error.message : "Invalid occupancy.",
    );
  }
  const rateQuery = tx
    .select()
    .from(schema.nightlyRates)
    .where(
      and(
        inArray(schema.nightlyRates.roomTypeId, ids),
        eq(schema.nightlyRates.ratePlanId, PLAN),
        gte(schema.nightlyRates.stayDate, selection.checkIn),
        lt(schema.nightlyRates.stayDate, selection.checkOut),
      ),
    )
    .orderBy(schema.nightlyRates.roomTypeId, schema.nightlyRates.stayDate);
  const rates = lock ? await rateQuery.for("share") : await rateQuery;
  const [plan] = await tx
    .select()
    .from(schema.ratePlans)
    .where(eq(schema.ratePlans.id, PLAN));
  if (!plan)
    throw new BookingError(
      "MISSING_RATE",
      "The Standard stay plan is not configured.",
      409,
    );
  const nights: Night[] = [];
  for (const item of selection.items) {
    const room = rooms.find((row) => row.id === item.roomTypeId)!;
    for (const stayDate of dates) {
      const stock = inventory.find(
        (row) =>
          row.roomTypeId === item.roomTypeId && row.stayDate === stayDate,
      );
      if (!stock)
        throw new BookingError(
          "UNAVAILABLE",
          `${room.name}: inventory is not configured for ${stayDate}.`,
          409,
        );
      if (stock.blackout || stock.allotment - stock.booked < item.quantity)
        throw new BookingError(
          "UNAVAILABLE",
          `${room.name} is unavailable for ${stayDate}.`,
          409,
        );
      const rate = rates.find(
        (row) =>
          row.roomTypeId === item.roomTypeId && row.stayDate === stayDate,
      );
      if (!rate)
        throw new BookingError(
          "MISSING_RATE",
          `${room.name}: price unavailable for ${stayDate}.`,
          409,
        );
      try {
        nights.push({
          roomTypeId: room.id,
          roomTypeName: room.name,
          stayDate,
          quantity: item.quantity,
          ...splitInclusiveNight(rate.pricePaise, item.quantity),
        });
      } catch (error) {
        throw new BookingError(
          "RATE_CONFIGURATION",
          error instanceof Error ? error.message : "Invalid configured rate.",
          409,
        );
      }
    }
  }
  const data = {
    selection,
    ratePlanId: PLAN,
    ratePlanName: plan.name,
    nights,
    ...totals(nights),
    currency: "INR" as const,
  };
  return issueQuote({ ...data, hash: digest(data) }, options);
}

export async function createQuote(
  db: Database,
  input: unknown,
  options: Options,
) {
  const selection = validSelection(input, options.now);
  return db.transaction((tx) => quoteInTransaction(tx, selection, options), {
    isolationLevel: "repeatable read",
    accessMode: "read only",
  });
}

async function confirmationInTransaction(tx: Transaction, id: string) {
  const [booking] = await tx
    .select()
    .from(schema.bookings)
    .where(eq(schema.bookings.id, id));
  if (!booking) throw new BookingError("NOT_FOUND", "Booking not found.", 404);
  const items = await tx
    .select()
    .from(schema.bookingItems)
    .where(eq(schema.bookingItems.bookingId, id))
    .orderBy(schema.bookingItems.roomTypeId);
  const nights = await tx
    .select()
    .from(schema.bookingNights)
    .where(eq(schema.bookingNights.bookingId, id))
    .orderBy(schema.bookingNights.roomTypeId, schema.bookingNights.stayDate);
  // Contact details and retry fingerprints are never returned from the bearer-reference endpoint.
  return {
    id,
    createdAt: booking.createdAt.toISOString(),
    ratePlanName: booking.ratePlanName,
    currency: "INR",
    selection: {
      checkIn: booking.checkIn,
      checkOut: booking.checkOut,
      adults: booking.adults,
      children: booking.children,
      items: items.map((item) => ({
        roomTypeId: item.roomTypeId,
        roomTypeName: item.roomTypeName,
        quantity: item.quantity,
        adults: item.adults,
        children: item.children,
      })),
    },
    nights,
    ...totals(nights),
  };
}
export async function getConfirmation(db: Database, id: string) {
  if (!z.uuid().safeParse(id).success)
    throw new BookingError("NOT_FOUND", "Booking not found.", 404);
  return db.transaction((tx) => confirmationInTransaction(tx, id), {
    isolationLevel: "repeatable read",
    accessMode: "read only",
  });
}

export async function confirmBooking(
  db: Database,
  raw: unknown,
  options: Options,
) {
  const parsed = confirmationSchema.safeParse(raw);
  if (!parsed.success)
    throw new BookingError(
      "INVALID_REQUEST",
      "Review your booking details and agreement choices before continuing.",
    );
  const input = parsed.data;
  if (input.paymentOutcome !== "success")
    throw new BookingError(
      "PAYMENT_FAILED",
      "Simulated payment failed; no inventory was reserved.",
      402,
    );
  const accepted = tokenPayload(input.quoteToken, options.secret);
  const selection = canonical(input.selection);
  const fingerprint = digest({
    selection,
    contact: { ...input.contact, phone: input.contact.phone ?? null },
    quoteHash: accepted.hash,
    ...(input.acceptance ? { acceptance: input.acceptance } : {}),
  });
  const submissionId = input.submissionId.toLowerCase();
  return db.transaction(async (tx) => {
    await tx.execute(sql`SET LOCAL lock_timeout = '10s'`);
    await tx.execute(sql`SET LOCAL statement_timeout = '20s'`);
    await tx.execute(
      sql`SELECT pg_advisory_xact_lock(hashtextextended(${`booking:${submissionId}`}, 0))`,
    );
    const [existing] = await tx
      .select()
      .from(schema.bookings)
      .where(eq(schema.bookings.submissionId, submissionId));
    if (existing) {
      if (existing.requestFingerprint !== fingerprint)
        throw new BookingError(
          "IDEMPOTENCY_CONFLICT",
          "This submission ID was already used for different details.",
          409,
        );
      return confirmationInTransaction(tx, existing.id);
    }
    // Resolve exact committed retries before applying new validation or policy versions.
    if (!isCurrentAcceptance(input.acceptance))
      throw new BookingError(
        "POLICY_ACCEPTANCE_REQUIRED",
        "Review and accept the current booking terms and data-use notice before confirming.",
      );
    const contactCheck = validContactSchema.safeParse(input.contact);
    if (!contactCheck.success)
      throw new BookingError(
        "INVALID_CONTACT",
        contactCheck.error.issues[0]?.message ?? "Check your contact details.",
      );
    const now = options.now ?? new Date();
    const valid = validSelection(selection, now);
    const quote = await quoteInTransaction(
      tx,
      valid,
      { ...options, now },
      true,
    );
    if (accepted.expiresAt <= (options.now ?? new Date()).getTime())
      throw new BookingError(
        "QUOTE_EXPIRED",
        "Your quote expired. Review the refreshed quote.",
        409,
        quote,
      );
    if (accepted.hash !== quote.hash)
      throw new BookingError(
        "QUOTE_CHANGED",
        "Prices or booking details changed. Review the refreshed quote.",
        409,
        quote,
      );
    const [booking] = await tx
      .insert(schema.bookings)
      .values({
        submissionId,
        requestFingerprint: fingerprint,
        termsVersion: input.acceptance!.termsVersion,
        dataUseVersion: input.acceptance!.dataUseVersion,
        policyAcceptedAt: now,
        contactName: input.contact.name,
        contactEmail: input.contact.email,
        contactPhone: input.contact.phone ?? null,
        checkIn: valid.checkIn,
        checkOut: valid.checkOut,
        adults: valid.adults,
        children: valid.children,
        ratePlanId: PLAN,
        ratePlanName: quote.ratePlanName,
      })
      .returning({ id: schema.bookings.id });
    await tx.insert(schema.bookingItems).values(
      valid.items.map((item) => ({
        ...item,
        bookingId: booking.id,
        roomTypeName: quote.nights.find(
          (night) => night.roomTypeId === item.roomTypeId,
        )!.roomTypeName,
      })),
    );
    await tx.insert(schema.bookingNights).values(
      quote.nights.map((night) => ({
        roomTypeId: night.roomTypeId,
        stayDate: night.stayDate,
        unitPricePaise: night.unitPricePaise,
        subtotalPaise: night.subtotalPaise,
        taxPaise: night.taxPaise,
        totalPaise: night.totalPaise,
        taxRateBps: night.taxRateBps,
        rateIncludesTax: night.rateIncludesTax,
        bookingId: booking.id,
      })),
    );
    for (const night of quote.nights) {
      const updated = await tx
        .update(schema.nightlyInventory)
        .set({
          booked: sql`${schema.nightlyInventory.booked} + ${night.quantity}`,
        })
        .where(
          and(
            eq(schema.nightlyInventory.roomTypeId, night.roomTypeId),
            eq(schema.nightlyInventory.stayDate, night.stayDate),
            eq(schema.nightlyInventory.blackout, false),
            sql`${schema.nightlyInventory.booked} + ${night.quantity} <= ${schema.nightlyInventory.allotment}`,
          ),
        )
        .returning({ id: schema.nightlyInventory.roomTypeId });
      if (updated.length !== 1)
        throw new BookingError(
          "UNAVAILABLE",
          "Inventory changed; no part of this booking was reserved.",
          409,
        );
    }
    return confirmationInTransaction(tx, booking.id);
  });
}
