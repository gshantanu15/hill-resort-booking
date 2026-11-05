import type { BookingSelection } from "./booking-validation";
export function withGuestTotals(selection: BookingSelection): BookingSelection {
  return {
    ...selection,
    adults: selection.items.reduce((sum, item) => sum + item.adults, 0),
    children: selection.items.reduce((sum, item) => sum + item.children, 0),
  };
}
export function quantityLimit(available: number | undefined): number {
  return available !== undefined &&
    Number.isSafeInteger(available) &&
    available > 0
    ? available
    : 0;
}

export function guestCounts(adults: number, children: number): string {
  return `${adults} ${adults === 1 ? "adult" : "adults"}, ${children} ${children === 1 ? "child" : "children"}`;
}

export function safeMessage(value: unknown, fallback: string): string {
  if (
    typeof value !== "string" ||
    !value.trim() ||
    value.length > 500 ||
    /^\s*[\[{]/.test(value) ||
    /invalid_format|ZodError|SQLSTATE|unexpected token|unexpected end|JSON|failed to fetch|networkerror|load failed|\bat \w+.*\(.*:\d+/i.test(
      value,
    )
  )
    return fallback;
  return value;
}
