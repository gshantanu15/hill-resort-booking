import { describe, expect, it } from "vitest";
import {
  addStayDays,
  inventoryRange,
  stayNights,
} from "../src/lib/staff-calendar";

describe("staff stay-night ranges", () => {
  it("keeps inclusive stay nights and the exclusive API end distinct", () => {
    const range = { start: "2026-11-03", end: "2026-11-09" };
    expect(inventoryRange(range)).toEqual({
      start: "2026-11-03",
      end: "2026-11-10",
    });
    expect(stayNights(range)).toHaveLength(7);
    expect(stayNights(range).at(-1)).toBe("2026-11-09");
  });
  it("allows 1 through 31 staff nights and rejects reversed or oversized ranges", () => {
    expect(stayNights({ start: "2026-11-03", end: "2026-11-03" })).toEqual([
      "2026-11-03",
    ]);
    expect(stayNights({ start: "2026-11-03", end: "2026-12-03" })).toHaveLength(
      31,
    );
    expect(() =>
      stayNights({ start: "2026-11-03", end: "2026-12-04" }),
    ).toThrow("1 and 31");
    expect(() =>
      stayNights({ start: "2026-11-04", end: "2026-11-03" }),
    ).toThrow();
  });
  it("uses calendar arithmetic across leap days, months and years", () => {
    expect(addStayDays("2028-02-28", 1)).toBe("2028-02-29");
    expect(addStayDays("2026-12-31", 1)).toBe("2027-01-01");
    expect(addStayDays("2026-11-03", -7)).toBe("2026-10-27");
    expect(() =>
      inventoryRange({ start: "2026-02-30", end: "2026-03-01" }),
    ).toThrow();
  });
});
