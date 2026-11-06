import { describe, expect, it } from "vitest";
import {
  assertResetTarget,
  DEMO_DATABASE_HOST,
  TEST_DATABASE_HOST,
  normalizedHost,
} from "../src/db/reset-demo";

describe("demo reset safety", () => {
  it("normalizes pooler hostnames", () =>
    expect(
      normalizedHost(`postgresql://u:p@${DEMO_DATABASE_HOST}-pooler/neondb`),
    ).toBe(DEMO_DATABASE_HOST));
  it("allows only direct approved targets", () => {
    expect(
      assertResetTarget(`postgresql://u:p@${DEMO_DATABASE_HOST}/neondb`),
    ).toBe(DEMO_DATABASE_HOST);
    expect(
      assertResetTarget(`postgresql://u:p@${TEST_DATABASE_HOST}/neondb`),
    ).toBe(TEST_DATABASE_HOST);
    expect(() =>
      assertResetTarget("postgresql://u:p@example.test/neondb"),
    ).toThrow(/approved/);
    expect(() =>
      assertResetTarget(`postgresql://u:p@${DEMO_DATABASE_HOST}-pooler/neondb`),
    ).toThrow(/direct/);
    expect(() => assertResetTarget("not-a-database-url")).toThrow();
    expect(() =>
      assertResetTarget(`postgresql://u:p@${DEMO_DATABASE_HOST}/otherdb`),
    ).toThrow(/neondb/);
  });
});
