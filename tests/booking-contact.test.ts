import { describe, expect, it } from "vitest";
import { phoneProblem } from "../src/lib/booking-contact";

describe("booking contact validation", () => {
  it("allows an omitted optional phone", () => {
    expect(phoneProblem("")).toBe("");
    expect(phoneProblem("   ")).toBe("");
  });

  it("requires a country-coded, parseable phone when supplied", () => {
    expect(phoneProblem("not a phone")).not.toBe("");
    expect(phoneProblem("98765 43210")).not.toBe("");
    expect(phoneProblem("+91 98765 43210")).toBe("");
  });

  it("rejects values outside the supported international length", () => {
    expect(phoneProblem("+1 2")).not.toBe("");
    expect(phoneProblem("+999999999999999999999")).not.toBe("");
  });
});
