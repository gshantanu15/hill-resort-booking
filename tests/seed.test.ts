import { describe, expect, it } from "vitest";
import { sampleRooms } from "../src/db/sample-rooms";
describe("room seed contract", () => {
  it("has unique keys and positive whole-paise prices and capacities", () => {
    expect(new Set(sampleRooms.map((r) => r.id)).size).toBe(sampleRooms.length);
    for (const room of sampleRooms) {
      expect(Number.isInteger(room.baseRatePaise)).toBe(true);
      expect(room.baseRatePaise).toBeGreaterThan(0);
      expect(room.capacity).toBeGreaterThan(0);
      expect(room.image).toMatch(/^https:\/\/images\.unsplash\.com\//);
    }
  });
});
