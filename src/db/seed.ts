import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { createDemoSeed } from "./demo-seed";
import * as schema from "./schema";

type SeedDatabase = Pick<PostgresJsDatabase<typeof schema>, "transaction">;

export async function seedDemoData(db: SeedDatabase) {
  const seed = createDemoSeed();
  return db.transaction(async (tx) => {
    const rooms = await tx
      .insert(schema.roomTypes)
      .values(seed.rooms)
      .onConflictDoNothing()
      .returning({ id: schema.roomTypes.id });
    const stored = await tx
      .select({
        id: schema.roomTypes.id,
        physicalUnits: schema.roomTypes.physicalUnits,
        websiteLimit: schema.roomTypes.websiteLimit,
      })
      .from(schema.roomTypes)
      .orderBy(schema.roomTypes.id)
      .for("share");
    if (
      stored.length !== seed.rooms.length ||
      seed.rooms.some((expected) => {
        const actual = stored.find((room) => room.id === expected.id);
        return (
          !actual ||
          actual.physicalUnits !== expected.physicalUnits ||
          actual.websiteLimit !== expected.websiteLimit
        );
      })
    ) {
      throw new Error(
        "Stored physical/channel stock differs from the approved demo configuration; no seed changes committed.",
      );
    }
    const plans = await tx
      .insert(schema.ratePlans)
      .values(seed.plan)
      .onConflictDoNothing()
      .returning({ id: schema.ratePlans.id });
    const inventory = await tx
      .insert(schema.nightlyInventory)
      .values(seed.inventory)
      .onConflictDoNothing()
      .returning({ id: schema.nightlyInventory.roomTypeId });
    const rates = await tx
      .insert(schema.nightlyRates)
      .values(seed.rates)
      .onConflictDoNothing()
      .returning({ id: schema.nightlyRates.roomTypeId });
    return {
      rooms: rooms.length,
      plans: plans.length,
      inventory: inventory.length,
      rates: rates.length,
    };
  });
}
