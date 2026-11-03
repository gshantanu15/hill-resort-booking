import { describe, expect, it } from "vitest";
import {
  parseAllotment,
  parseCalendarDate,
  parsePricePaise,
  parsePricePaiseInteger,
  parseRange,
  validateInventoryPatch,
} from "../src/lib/staff-inventory";

describe("staff inventory input contracts", () => {
  it("parses positive INR values to integer paise", () => {
    expect(parsePricePaise("100.25")).toBe(10025);
    expect(parsePricePaise(100)).toBe(10000);
    expect(() => parsePricePaise("0")).toThrow();
    expect(() => parsePricePaise("10.999")).toThrow();
  });
  it("requires integer paise for API patches", () => {
    expect(parsePricePaiseInteger(10000)).toBe(10000);
    expect(() => parsePricePaiseInteger(10000.5)).toThrow();
    expect(() => parsePricePaiseInteger("10000")).toThrow();
  });
  it("validates real dates and bounded ranges", () => {
    expect(parseCalendarDate("2026-11-03")).toBe("2026-11-03");
    expect(() => parseCalendarDate("2026-02-29")).toThrow();
    expect(parseRange("2026-11-03", "2026-11-04").end).toBe("2026-11-04");
    expect(() => parseRange("2026-11-04", "2026-11-03")).toThrow();
    expect(() => parseRange("2026-11-03", "2026-12-05")).toThrow();
  });
  it("rejects unknown fields and prices incompatible with tax arithmetic", () => {
    const base = {
      roomTypeId: "estate-room",
      stayDate: "2026-11-10",
      ratePlanId: "standard-stay",
      pricePaise: 1000000,
      allotment: 2,
      blackout: false,
    };
    expect(validateInventoryPatch(base).pricePaise).toBe(1000000);
    expect(() => validateInventoryPatch({ ...base, booked: 0 })).toThrow(
      "Unknown inventory field",
    );
    expect(() =>
      validateInventoryPatch({ ...base, pricePaise: 850000 }),
    ).toThrow();
  });
  it("enforces nonnegative integer allotments", () => {
    expect(parseAllotment(0)).toBe(0);
    expect(() => parseAllotment(-1)).toThrow();
    expect(() => parseAllotment(1.5)).toThrow();
  });
});
