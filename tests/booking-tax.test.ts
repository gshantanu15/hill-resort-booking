import { describe, expect, it } from "vitest";
import { splitInclusiveNight } from "../src/lib/booking-tax";

describe("inclusive nightly tax", () => {
  it("uses the 5% slab at the lower boundary", () => {
    const result = splitInclusiveNight(787500);
    const net = 750000;
    expect(result).toMatchObject({
      unitPricePaise: 787500,
      subtotalPaise: net,
      taxPaise: 787500 - net,
      totalPaise: 787500,
      taxRateBps: 500,
      rateIncludesTax: true,
    });
  });

  it("uses the 18% slab above the upper boundary", () => {
    const result = splitInclusiveNight(885001);
    const net = 750001;
    expect(result).toMatchObject({
      unitPricePaise: 885001,
      subtotalPaise: net,
      taxPaise: 885001 - net,
      totalPaise: 885001,
      taxRateBps: 1800,
      rateIncludesTax: true,
    });
  });

  it("rejects the undefined middle slab", () => {
    expect(() => splitInclusiveNight(850000)).toThrow();
  });

  it("multiplies a rounded per-unit breakdown exactly", () => {
    const unit = splitInclusiveNight(787500, 3);
    expect(unit.unitPricePaise).toBe(787500);
    expect(unit.totalPaise).toBe(2362500);
    expect(unit.subtotalPaise + unit.taxPaise).toBe(unit.totalPaise);
    expect(unit.taxPaise).toBe(112500);
  });

  it.each([
    [-1, 1],
    [900000, 0],
    [900000.5, 1],
    [2147483648, 1],
  ])("rejects invalid price/quantity inputs (%s, %s)", (price, quantity) => {
    expect(() => splitInclusiveNight(price, quantity)).toThrow();
  });

  it("rejects a valid unit price whose group total exceeds the integer range", () => {
    expect(() => splitInclusiveNight(900000, 2387)).toThrow();
  });
});
