import { z } from "zod";

export const RESORT_TIME_ZONE = "Asia/Kolkata";
export const FIRST_STAY_DATE = "2026-11-03";
export const LAST_STAY_DATE = "2027-05-01";
export const MAX_CHECK_OUT_DATE = "2027-05-02";
export const MAX_NIGHTS = 14;
export const INTEGER_MAX = 2_147_483_647;

const datePattern = /^\d{4}-\d{2}-\d{2}$/;
const dateSchema = z
  .string()
  .regex(datePattern, "Date must be in YYYY-MM-DD format");
const countSchema = z.number().int().min(0).max(INTEGER_MAX);
const itemSchema = z
  .object({
    roomTypeId: z.string().trim().min(1).max(80),
    quantity: z.number().int().min(1).max(INTEGER_MAX),
    adults: countSchema,
    children: countSchema,
  })
  .strict();

export const bookingSelectionSchema = z
  .object({
    checkIn: dateSchema,
    checkOut: dateSchema,
    adults: countSchema,
    children: countSchema,
    items: z.array(itemSchema).min(1).max(3),
  })
  .strict();

export type BookingSelection = z.infer<typeof bookingSelectionSchema>;

function parseDate(value: string): Date {
  if (!datePattern.test(value))
    throw new Error("Date must be in YYYY-MM-DD format");
  const date = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime()))
    throw new Error(`Invalid calendar date: ${value}`);
  if (date.toISOString().slice(0, 10) !== value)
    throw new Error(`Invalid calendar date: ${value}`);
  return date;
}

function compareDates(a: string, b: string): number {
  return parseDate(a).getTime() - parseDate(b).getTime();
}

export function resortToday(now: Date = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: RESORT_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const values = Object.fromEntries(
    parts.map((part) => [part.type, part.value]),
  );
  return `${values.year}-${values.month}-${values.day}`;
}

export function stayNights(checkIn: string, checkOut: string): string[] {
  const start = parseDate(checkIn);
  const end = parseDate(checkOut);
  if (end <= start) throw new Error("Check-out must be after check-in");
  const dayCount = (end.getTime() - start.getTime()) / 86_400_000;
  if (dayCount > MAX_NIGHTS)
    throw new Error(`Stay must be between 1 and ${MAX_NIGHTS} nights`);
  const nights: string[] = [];
  for (
    let cursor = start;
    cursor < end;
    cursor = new Date(cursor.getTime() + 86_400_000)
  ) {
    nights.push(cursor.toISOString().slice(0, 10));
  }
  return nights;
}

export function validateStay(
  checkIn: string,
  checkOut: string,
  now: Date = new Date(),
): string[] {
  const nights = stayNights(checkIn, checkOut);
  if (compareDates(checkIn, resortToday(now)) < 0) {
    throw new Error("Check-in cannot be before today at the resort");
  }
  if (
    compareDates(checkIn, FIRST_STAY_DATE) < 0 ||
    compareDates(checkOut, MAX_CHECK_OUT_DATE) > 0
  ) {
    throw new Error("Stay dates are outside the configured booking calendar");
  }
  return nights;
}

export function validateSelection(
  input: unknown,
  now: Date = new Date(),
): BookingSelection {
  const parsed = bookingSelectionSchema.safeParse(input);
  if (!parsed.success) {
    const path = parsed.error.issues[0]?.path;
    if (path?.[0] === "checkIn" || path?.[0] === "checkOut")
      throw new Error(
        "Choose both an arrival and a departure date before continuing.",
      );
    if (path?.[0] === "items" && path.length === 1)
      throw new Error("Choose at least one room or villa before continuing.");
    throw new Error(
      "Check accommodation quantities and guest counts. Use whole numbers within the available limits.",
    );
  }
  const selection = parsed.data;
  parseDate(selection.checkIn);
  parseDate(selection.checkOut);
  validateStay(selection.checkIn, selection.checkOut, now);
  if (selection.adults + selection.children < 1)
    throw new Error("At least one guest is required");
  const ids = new Set<string>();
  let itemAdults = 0;
  let itemChildren = 0;
  for (const item of selection.items) {
    if (ids.has(item.roomTypeId))
      throw new Error("Each room type may appear only once");
    ids.add(item.roomTypeId);
    if (item.adults < item.quantity)
      throw new Error(
        `At least one adult is required per booked unit for ${item.roomTypeId}`,
      );
    itemAdults += item.adults;
    itemChildren += item.children;
  }
  if (itemAdults !== selection.adults || itemChildren !== selection.children) {
    throw new Error(
      "Room-group guest allocations must match the booking totals",
    );
  }
  return selection;
}

export function validateOccupancy(
  selection: BookingSelection,
  rooms: { id: string; capacity: number; websiteLimit: number }[],
): void {
  const roomMap = new Map(rooms.map((room) => [room.id, room]));
  for (const item of selection.items) {
    const room = roomMap.get(item.roomTypeId);
    if (!room) throw new Error(`Unknown room type: ${item.roomTypeId}`);
    if (
      !Number.isSafeInteger(room.capacity) ||
      room.capacity < 0 ||
      !Number.isSafeInteger(room.websiteLimit) ||
      room.websiteLimit < 0
    ) {
      throw new Error(`Invalid inventory configuration for ${item.roomTypeId}`);
    }
    if (item.quantity > room.websiteLimit)
      throw new Error(
        `Requested quantity exceeds website availability for ${item.roomTypeId}`,
      );
    if (
      item.quantity >
      Math.floor(Number.MAX_SAFE_INTEGER / Math.max(1, room.capacity))
    ) {
      throw new Error(
        `Requested quantity exceeds safe capacity for ${item.roomTypeId}`,
      );
    }
    if (item.adults + item.children > item.quantity * room.capacity) {
      throw new Error(`Guests exceed capacity for ${item.roomTypeId}`);
    }
  }
}
