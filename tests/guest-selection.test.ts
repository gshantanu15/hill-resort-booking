import { safeMessage } from "../src/lib/guest-selection";
import { describe, it, expect } from "vitest";
import {
  withGuestTotals,
  quantityLimit,
  guestCounts,
} from "../src/lib/guest-selection";
describe("guest selection contracts", () => {
  it("derives overall guests from mixed accommodation allocations without altering items", () => {
    const selection = {
      checkIn: "2026-11-10",
      checkOut: "2026-11-12",
      adults: 99,
      children: 99,
      items: [
        { roomTypeId: "estate-room", quantity: 2, adults: 2, children: 1 },
        { roomTypeId: "estate-villa", quantity: 1, adults: 2, children: 0 },
      ],
    };
    const result = withGuestTotals(selection);
    expect(result.adults).toBe(4);
    expect(result.children).toBe(1);
    expect(result.items).toBe(selection.items);
    expect(selection.adults).toBe(99);
  });
  it("leaves invalid allocations for boundary validation rather than silently clamping them", () => {
    const result = withGuestTotals({
      checkIn: "",
      checkOut: "",
      adults: 0,
      children: 0,
      items: [
        { roomTypeId: "estate-room", quantity: 1, adults: -1, children: 5 },
      ],
    });
    expect(result.adults).toBe(-1);
    expect(result.children).toBe(5);
  });
  it("does not advertise or permit increases with unknown, zero or invalid availability", () => {
    for (const value of [undefined, 0, -1, NaN, 1.5])
      expect(quantityLimit(value)).toBe(0);
    expect(quantityLimit(12)).toBe(12);
  });
});

it("formats singular guest counts without changing numbers", () => {
  expect(guestCounts(1, 1)).toBe("1 adult, 1 child");
  expect(guestCounts(4, 0)).toBe("4 adults, 0 children");
});

it("keeps guest correction messages and hides schema, network and response-parser details", () => {
  const fallback = "Unable to price your stay. Please retry.";
  for (const input of [
    '[{"code":"invalid_format"}]',
    "Unexpected token < in JSON at position 0",
    "Failed to fetch",
    { error: "database" },
    undefined,
    "",
    "a".repeat(501),
  ])
    expect(safeMessage(input, fallback)).toBe(fallback);
  expect(
    safeMessage(
      "Choose both an arrival and a departure date before continuing.",
      fallback,
    ),
  ).toContain("Choose both");
});
