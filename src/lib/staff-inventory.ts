export const MAX_INT = 2_147_483_647;
import { splitInclusiveNight } from "./booking-tax";

export class StaffInputError extends Error {}

export function parseCalendarDate(value: unknown): string {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new StaffInputError("Use a valid calendar date (YYYY-MM-DD).");
  }
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    throw new StaffInputError("Use a valid calendar date (YYYY-MM-DD).");
  }
  return value;
}

export function parsePricePaise(value: unknown): number {
  if (typeof value !== "string" && typeof value !== "number")
    throw new StaffInputError("Price is required.");
  const text = String(value).trim();
  if (!/^\d+(?:\.\d{1,2})?$/.test(text))
    throw new StaffInputError(
      "Price must be a positive INR amount with at most two decimals.",
    );
  const [rupees, fraction = ""] = text.split(".");
  const paise = Number(rupees) * 100 + Number((fraction + "00").slice(0, 2));
  if (!Number.isSafeInteger(paise) || paise <= 0 || paise > MAX_INT)
    throw new StaffInputError("Price is outside the allowed range.");
  return paise;
}

export function parsePricePaiseInteger(value: unknown): number {
  if (
    typeof value !== "number" ||
    !Number.isSafeInteger(value) ||
    value <= 0 ||
    value > MAX_INT
  ) {
    throw new StaffInputError(
      "Price must be a positive integer number of paise.",
    );
  }
  return value;
}

export function parseAllotment(value: unknown): number {
  if (
    typeof value !== "number" ||
    !Number.isSafeInteger(value) ||
    value < 0 ||
    value > MAX_INT
  ) {
    throw new StaffInputError("Allotment must be a non-negative whole number.");
  }
  return value;
}

export function parseBlackout(value: unknown): boolean {
  if (typeof value !== "boolean")
    throw new StaffInputError("Blackout must be true or false.");
  return value;
}

export function parseRange(
  start: unknown,
  end: unknown,
): { start: string; end: string } {
  const first = parseCalendarDate(start);
  const last = parseCalendarDate(end);
  const days =
    (Date.parse(`${last}T00:00:00Z`) - Date.parse(`${first}T00:00:00Z`)) /
    86_400_000;
  if (days <= 0 || days > 31)
    throw new StaffInputError("Select between 1 and 31 nights.");
  return { start: first, end: last };
}

export function validateInventoryPatch(input: unknown) {
  if (!input || typeof input !== "object")
    throw new StaffInputError("Invalid inventory update.");
  const value = input as Record<string, unknown>;
  const allowed = new Set([
    "roomTypeId",
    "stayDate",
    "ratePlanId",
    "pricePaise",
    "allotment",
    "blackout",
  ]);
  if (Object.keys(value).some((key) => !allowed.has(key)))
    throw new StaffInputError("Unknown inventory field.");
  if (typeof value.roomTypeId !== "string" || !value.roomTypeId.trim())
    throw new StaffInputError("Room type is required.");
  if (value.ratePlanId !== "standard-stay")
    throw new StaffInputError("Only the Standard stay plan can be edited.");
  const result = {
    roomTypeId: value.roomTypeId,
    stayDate: parseCalendarDate(value.stayDate),
    ratePlanId: "standard-stay" as const,
    pricePaise: parsePricePaiseInteger(value.pricePaise),
    allotment: parseAllotment(value.allotment),
    blackout: parseBlackout(value.blackout),
  };
  // Tax-inclusive pricing is the approved policy; reject prices between GST bands.
  try {
    splitInclusiveNight(result.pricePaise);
  } catch (error) {
    if (error instanceof StaffInputError) throw error;
    throw new StaffInputError(
      error instanceof Error
        ? error.message
        : "Price is not valid for the approved tax policy.",
    );
  }
  return result;
}

export function formatPaise(paise: number): string {
  return (paise / 100).toFixed(2);
}
