import { describe, expect, it } from "vitest";
import { createDemoSeed } from "../src/db/demo-seed";
import { sampleRooms } from "../src/db/sample-rooms";

describe("demo seed contract", () => {
  it("does not inherit nightly rates from a changed indicative catalogue price", () => {
    const room = sampleRooms.find((entry) => entry.id === "garden-room")!;
    const original = room.baseRatePaise;
    try {
      room.baseRatePaise = 1;
      const rate = createDemoSeed().rates.find(
        (entry) =>
          entry.roomTypeId === room.id && entry.stayDate === "2026-11-03",
      );
      expect(rate?.pricePaise).toBe(1050000);
    } finally {
      room.baseRatePaise = original;
    }
  });
  it("is deterministic and covers the approved 180-night calendar", () => {
    const first = createDemoSeed();
    const second = createDemoSeed();
    expect(second).toEqual(first);
    expect(
      first.rooms.map(({ id, physicalUnits, websiteLimit }) => ({
        id,
        physicalUnits,
        websiteLimit,
      })),
    ).toEqual([
      { id: "estate-room", physicalUnits: 48, websiteLimit: 12 },
      { id: "garden-room", physicalUnits: 16, websiteLimit: 4 },
      { id: "estate-villa", physicalUnits: 12, websiteLimit: 3 },
    ]);
    expect(first.plan).toEqual({ id: "standard-stay", name: "Standard stay" });
    expect(first.inventory).toHaveLength(540);
    expect(first.rates).toHaveLength(540);
    expect(first.inventory[0].stayDate).toBe("2026-11-03");
    expect(first.inventory.at(-1)?.stayDate).toBe("2027-05-01");
    expect(
      new Set(first.inventory.map((r) => `${r.roomTypeId}/${r.stayDate}`)).size,
    ).toBe(540);
    expect(
      new Set(
        first.rates.map((r) => `${r.roomTypeId}/${r.ratePlanId}/${r.stayDate}`),
      ).size,
    ).toBe(540);
    expect(
      first.inventory.every(
        (r) =>
          r.booked === 0 &&
          r.blackout === false &&
          r.allotment === r.websiteLimit,
      ),
    ).toBe(true);
  });

  it("keeps total physical stock, website caps, and weekday/weekend prices explicit", () => {
    const { rooms, rates } = createDemoSeed();
    expect(rooms.reduce((sum, room) => sum + room.physicalUnits, 0)).toBe(76);
    expect(rooms.reduce((sum, room) => sum + room.websiteLimit, 0)).toBe(19);
    expect(
      rooms.reduce(
        (sum, room) => sum + room.physicalUnits - room.websiteLimit,
        0,
      ),
    ).toBe(57);
    const expected = new Map([
      ["estate-room", [900000, 990000]],
      ["garden-room", [1050000, 1155000]],
      ["estate-villa", [1850000, 2035000]],
    ]);
    for (const rate of rates) {
      const day = new Date(`${rate.stayDate}T00:00:00Z`).getUTCDay();
      const [weekday, weekend] = expected.get(rate.roomTypeId)!;
      expect(rate.pricePaise).toBe(day === 5 || day === 6 ? weekend : weekday);
    }
  });
});
