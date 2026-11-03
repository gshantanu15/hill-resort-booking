import { randomUUID } from "node:crypto";
import postgres from "postgres";
import { and, count, eq, inArray } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import * as schema from "../../src/db/schema";
import { createDemoSeed } from "../../src/db/demo-seed";
import { seedDemoData } from "../../src/db/seed";

const url = process.env.TEST_DATABASE_URL;
if (!url)
  throw new Error("Set TEST_DATABASE_URL to an isolated test database.");
if (new URL(url).hostname.includes("-pooler"))
  throw new Error(
    "TEST_DATABASE_URL must use a direct connection for migrations.",
  );
const client = postgres(url, {
  max: 1,
  prepare: false,
  connect_timeout: 10,
  onnotice: () => {},
});
const db = drizzle(client, { schema });
type TestTransaction = Parameters<Parameters<typeof db.transaction>[0]>[0];
beforeAll(async () => {
  await migrate(db, { migrationsFolder: "./drizzle" });
});
afterAll(async () => {
  await client.end();
});
const rollback = new Error("Roll back synthetic seed fixture");

async function fixture(run: (tx: TestTransaction) => Promise<void>) {
  try {
    await db.transaction(async (tx) => {
      const seed = createDemoSeed();
      await tx
        .insert(schema.roomTypes)
        .values(seed.rooms)
        .onConflictDoNothing();
      const ids = seed.rooms.map((room) => room.id);
      // Isolated test setup only: these deletes never commit or run in the seed command.
      await tx
        .delete(schema.nightlyInventory)
        .where(inArray(schema.nightlyInventory.roomTypeId, ids));
      await tx
        .delete(schema.nightlyRates)
        .where(inArray(schema.nightlyRates.roomTypeId, ids));
      await run(tx);
      throw rollback;
    });
  } catch (error) {
    if (error !== rollback) throw error;
  }
}

describe("demo seed database contract", () => {
  it("inserts the complete calendar and an idempotent rerun inserts nothing", async () => {
    await fixture(async (tx) => {
      const existingPlan = await tx
        .select()
        .from(schema.ratePlans)
        .where(eq(schema.ratePlans.id, "standard-stay"));
      await expect(seedDemoData(tx)).resolves.toEqual({
        rooms: 0,
        plans: existingPlan.length ? 0 : 1,
        inventory: 540,
        rates: 540,
      });
      await expect(seedDemoData(tx)).resolves.toEqual({
        rooms: 0,
        plans: 0,
        inventory: 0,
        rates: 0,
      });
      const [inventory] = await tx
        .select({ value: count() })
        .from(schema.nightlyInventory);
      const [rates] = await tx
        .select({ value: count() })
        .from(schema.nightlyRates);
      expect(inventory.value).toBe(540);
      expect(rates.value).toBe(540);
    });
  });

  it("fills missing rows while preserving edits, counters, and a saved booking", async () => {
    await fixture(async (tx) => {
      await seedDemoData(tx);
      const estateNight = and(
        eq(schema.nightlyInventory.roomTypeId, "estate-room"),
        eq(schema.nightlyInventory.stayDate, "2026-11-03"),
      );
      await tx
        .update(schema.nightlyInventory)
        .set({ allotment: 2, booked: 1, blackout: true })
        .where(estateNight);
      await tx
        .update(schema.nightlyRates)
        .set({ pricePaise: 999999 })
        .where(
          and(
            eq(schema.nightlyRates.roomTypeId, "estate-room"),
            eq(schema.nightlyRates.stayDate, "2026-11-03"),
          ),
        );
      await tx
        .update(schema.roomTypes)
        .set({ name: "Edited Garden", baseRatePaise: 123 })
        .where(eq(schema.roomTypes.id, "garden-room"));
      await tx
        .update(schema.ratePlans)
        .set({ name: "Edited plan" })
        .where(eq(schema.ratePlans.id, "standard-stay"));
      const [booking] = await tx
        .insert(schema.bookings)
        .values({
          submissionId: randomUUID(),
          requestFingerprint: "a".repeat(64),
          contactName: "Seed Guest",
          contactEmail: "seed@example.test",
          checkIn: "2026-11-03",
          checkOut: "2026-11-04",
          adults: 2,
          children: 0,
          ratePlanId: "standard-stay",
          ratePlanName: "Standard stay",
        })
        .returning();
      const [item] = await tx
        .insert(schema.bookingItems)
        .values({
          bookingId: booking.id,
          roomTypeId: "estate-room",
          roomTypeName: "Estate room",
          quantity: 1,
          adults: 2,
          children: 0,
        })
        .returning();
      // A synthetic stored breakdown, not a selected tax policy.
      const [night] = await tx
        .insert(schema.bookingNights)
        .values({
          bookingId: booking.id,
          roomTypeId: "estate-room",
          stayDate: "2026-11-03",
          unitPricePaise: 999999,
          subtotalPaise: 999999,
          taxPaise: 0,
          totalPaise: 999999,
          taxRateBps: 0,
          rateIncludesTax: false,
        })
        .returning();
      const gardenNight = and(
        eq(schema.nightlyInventory.roomTypeId, "garden-room"),
        eq(schema.nightlyInventory.stayDate, "2026-11-04"),
      );
      const gardenRate = and(
        eq(schema.nightlyRates.roomTypeId, "garden-room"),
        eq(schema.nightlyRates.ratePlanId, "standard-stay"),
        eq(schema.nightlyRates.stayDate, "2026-11-04"),
      );
      await tx.delete(schema.nightlyInventory).where(gardenNight);
      await tx.delete(schema.nightlyRates).where(gardenRate);
      await expect(seedDemoData(tx)).resolves.toEqual({
        rooms: 0,
        plans: 0,
        inventory: 1,
        rates: 1,
      });

      const [savedInventory] = await tx
        .select()
        .from(schema.nightlyInventory)
        .where(estateNight);
      const [savedRate] = await tx
        .select()
        .from(schema.nightlyRates)
        .where(
          and(
            eq(schema.nightlyRates.roomTypeId, "estate-room"),
            eq(schema.nightlyRates.stayDate, "2026-11-03"),
          ),
        );
      expect(savedInventory).toMatchObject({
        allotment: 2,
        booked: 1,
        blackout: true,
      });
      expect(savedRate.pricePaise).toBe(999999);
      expect(
        await tx
          .select()
          .from(schema.bookings)
          .where(eq(schema.bookings.id, booking.id)),
      ).toEqual([booking]);
      expect(
        await tx
          .select()
          .from(schema.bookingItems)
          .where(eq(schema.bookingItems.bookingId, booking.id)),
      ).toEqual([item]);
      expect(
        await tx
          .select()
          .from(schema.bookingNights)
          .where(eq(schema.bookingNights.bookingId, booking.id)),
      ).toEqual([night]);
      const [room] = await tx
        .select()
        .from(schema.roomTypes)
        .where(eq(schema.roomTypes.id, "garden-room"));
      const [plan] = await tx
        .select()
        .from(schema.ratePlans)
        .where(eq(schema.ratePlans.id, "standard-stay"));
      const [restoredRate] = await tx
        .select()
        .from(schema.nightlyRates)
        .where(gardenRate);
      const [restoredInventory] = await tx
        .select()
        .from(schema.nightlyInventory)
        .where(gardenNight);
      expect(room).toMatchObject({ name: "Edited Garden", baseRatePaise: 123 });
      expect(plan.name).toBe("Edited plan");
      expect(restoredRate.pricePaise).toBe(1050000);
      expect(restoredInventory).toMatchObject({
        allotment: 4,
        booked: 0,
        blackout: false,
        websiteLimit: 4,
      });
    });
  });

  it.each([
    ["physical stock", { physicalUnits: 49 }],
    ["website ceiling", { websiteLimit: 11 }],
  ])(
    "rejects mismatched %s without partially seeding",
    async (_label, values) => {
      await fixture(async (tx) => {
        await tx
          .update(schema.roomTypes)
          .set(values)
          .where(eq(schema.roomTypes.id, "estate-room"));
        const before = await tx.select().from(schema.ratePlans);
        await expect(seedDemoData(tx)).rejects.toThrow(/stock differs/i);
        const [inventory] = await tx
          .select({ value: count() })
          .from(schema.nightlyInventory);
        const [rates] = await tx
          .select({ value: count() })
          .from(schema.nightlyRates);
        expect(inventory.value).toBe(0);
        expect(rates.value).toBe(0);
        expect(await tx.select().from(schema.ratePlans)).toEqual(before);
      });
    },
  );
});
