import { describe, expect, it } from "vitest";
import {
  bookingSelectionSchema,
  resortToday,
  stayNights,
  validateOccupancy,
  validateSelection,
} from "../src/lib/booking-validation";

const now = new Date("2026-11-03T06:00:00Z");
const valid = {
  checkIn: "2026-11-03",
  checkOut: "2026-11-04",
  adults: 2,
  children: 0,
  items: [{ roomTypeId: "estate", quantity: 1, adults: 2, children: 0 }],
};

describe("booking validation", () => {
  it("accepts the minimum valid stay and returns calendar nights", () => {
    expect(validateSelection(valid, now)).toEqual(valid);
    expect(stayNights("2026-11-03", "2026-11-04")).toEqual(["2026-11-03"]);
  });
  it("accepts 14 nights but rejects 15", () => {
    expect(() =>
      validateSelection({ ...valid, checkOut: "2026-11-17" }, now),
    ).not.toThrow();
    expect(() =>
      validateSelection({ ...valid, checkOut: "2026-11-18" }, now),
    ).toThrow("between 1 and 14");
  });
  it("rejects malformed, leap-invalid, duplicate, and extra fields", () => {
    expect(() =>
      validateSelection({ ...valid, checkIn: "2026-11-03T00:00:00Z" }, now),
    ).toThrow();
    expect(() =>
      validateSelection({ ...valid, checkIn: "2027-02-29" }, now),
    ).toThrow();
    expect(() =>
      validateSelection(
        { ...valid, items: [valid.items[0], { ...valid.items[0] }] },
        now,
      ),
    ).toThrow("only once");
    expect(() =>
      bookingSelectionSchema.parse({ ...valid, extra: true }),
    ).toThrow();
  });
  it("uses India date for past-date checks, including UTC rollover", () => {
    expect(resortToday(new Date("2026-11-02T19:00:00Z"))).toBe("2026-11-03");
    expect(() =>
      validateSelection(valid, new Date("2026-11-03T18:30:00Z")),
    ).toThrow("before today");
  });
  it("enforces calendar coverage and group allocation policy", () => {
    expect(() =>
      validateSelection(
        { ...valid, checkIn: "2027-05-01", checkOut: "2027-05-02" },
        now,
      ),
    ).not.toThrow();
    expect(() =>
      validateSelection(
        { ...valid, checkIn: "2027-05-02", checkOut: "2027-05-03" },
        now,
      ),
    ).toThrow("configured booking calendar");
    expect(() =>
      validateSelection(
        { ...valid, adults: 1, items: [{ ...valid.items[0], adults: 2 }] },
        now,
      ),
    ).toThrow("allocations");
    expect(() =>
      validateSelection(
        { ...valid, items: [{ ...valid.items[0], adults: 0 }] },
        now,
      ),
    ).toThrow("adult");
  });
  it("checks room capacity and website limits", () => {
    const selection = validateSelection(valid, now);
    expect(() =>
      validateOccupancy(selection, [
        { id: "estate", capacity: 2, websiteLimit: 1 },
      ]),
    ).not.toThrow();
    expect(() =>
      validateOccupancy(selection, [
        { id: "estate", capacity: 1, websiteLimit: 1 },
      ]),
    ).toThrow("capacity");
    expect(() =>
      validateOccupancy(selection, [
        { id: "estate", capacity: 2, websiteLimit: 0 },
      ]),
    ).toThrow("availability");
    expect(() => validateOccupancy(selection, [])).toThrow("Unknown room type");
  });
});
