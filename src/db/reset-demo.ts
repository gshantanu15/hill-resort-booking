import { sql as drizzleSql } from "drizzle-orm";
import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import * as schema from "./schema";
import { createDemoSeed } from "./demo-seed";
import { seedDemoData } from "./seed";

export const DEMO_DATABASE_HOST =
  "ep-little-snow-ao2w95lu.c-2.ap-southeast-1.aws.neon.tech";
export const TEST_DATABASE_HOST =
  "ep-small-bar-aopct83h.c-2.ap-southeast-1.aws.neon.tech";

export function normalizedHost(value: string) {
  return new URL(value).hostname.replace("-pooler", "");
}

export function assertResetTarget(url: string) {
  const parsed = new URL(url);
  if (parsed.protocol !== "postgresql:" && parsed.protocol !== "postgres:")
    throw new Error("Reset target must be a PostgreSQL URL.");
  if (parsed.hostname.includes("-pooler"))
    throw new Error(
      "Reset requires a direct (non-pooled) database connection.",
    );
  if (parsed.pathname !== "/neondb")
    throw new Error("Reset target must use the approved neondb database.");
  const host = normalizedHost(url);
  if (host !== DEMO_DATABASE_HOST && host !== TEST_DATABASE_HOST)
    throw new Error(
      "Reset target is not an approved demo or isolated test database.",
    );
  return host;
}

export async function resetDemoDatabase(client: postgres.Sql) {
  const db = drizzle(client, { schema });
  const seed = createDemoSeed();
  return db.transaction(async (tx) => {
    await tx.execute(drizzleSql`set local lock_timeout = '5s'`);
    await tx.execute(drizzleSql`set local statement_timeout = '30s'`);
    await tx.execute(
      drizzleSql`lock table bookings, booking_items, booking_nights, enquiries, nightly_inventory, nightly_rates, room_types, rate_plans in share row exclusive mode`,
    );
    const active = await tx.execute<{ processing_state: string }>(
      drizzleSql`select processing_state from enquiries where processing_state = 'processing' limit 1`,
    );
    if (active.length)
      throw new Error("Reset refused while an enquiry is being analysed.");
    const rooms = await tx
      .select({
        id: schema.roomTypes.id,
        physicalUnits: schema.roomTypes.physicalUnits,
        websiteLimit: schema.roomTypes.websiteLimit,
      })
      .from(schema.roomTypes);
    if (
      rooms.length !== seed.rooms.length ||
      seed.rooms.some((expected) => {
        const actual = rooms.find((room) => room.id === expected.id);
        return (
          !actual ||
          actual.physicalUnits !== expected.physicalUnits ||
          actual.websiteLimit !== expected.websiteLimit
        );
      })
    )
      throw new Error(
        "Reset refused: room configuration differs from approved demo data.",
      );
    const plans = await tx
      .select({ id: schema.ratePlans.id })
      .from(schema.ratePlans);
    if (plans.length !== 1 || plans[0]?.id !== seed.plan.id)
      throw new Error(
        "Reset refused: rate-plan configuration differs from approved demo data.",
      );
    const expectedInventory = new Set(
      seed.inventory.map((row) => `${row.roomTypeId}:${row.stayDate}`),
    );
    const existingInventory = await tx.execute<{
      room_type_id: string;
      stay_date: string;
    }>(drizzleSql`select room_type_id, stay_date from nightly_inventory`);
    if (
      existingInventory.some(
        (row) => !expectedInventory.has(`${row.room_type_id}:${row.stay_date}`),
      )
    )
      throw new Error(
        "Reset refused: inventory rows fall outside the approved demo calendar.",
      );
    const expectedRates = new Set(
      seed.rates.map(
        (row) => `${row.roomTypeId}:${row.ratePlanId}:${row.stayDate}`,
      ),
    );
    const existingRates = await tx.execute<{
      room_type_id: string;
      rate_plan_id: string;
      stay_date: string;
    }>(
      drizzleSql`select room_type_id, rate_plan_id, stay_date from nightly_rates`,
    );
    if (
      existingRates.some(
        (row) =>
          !expectedRates.has(
            `${row.room_type_id}:${row.rate_plan_id}:${row.stay_date}`,
          ),
      )
    )
      throw new Error(
        "Reset refused: rate rows fall outside the approved demo calendar.",
      );
    await tx.execute(drizzleSql`delete from booking_nights`);
    await tx.execute(drizzleSql`delete from booking_items`);
    await tx.execute(drizzleSql`delete from bookings`);
    await tx.execute(drizzleSql`delete from enquiries`);
    await tx.execute(drizzleSql`delete from nightly_inventory`);
    await tx.execute(drizzleSql`delete from nightly_rates`);
    for (const room of seed.rooms)
      await tx
        .update(schema.roomTypes)
        .set({
          name: room.name,
          description: room.description,
          capacity: room.capacity,
          baseRatePaise: room.baseRatePaise,
          image: room.image,
          imageAlt: room.imageAlt,
        })
        .where(drizzleSql`${schema.roomTypes.id} = ${room.id}`);
    await tx
      .update(schema.ratePlans)
      .set({ name: seed.plan.name })
      .where(drizzleSql`${schema.ratePlans.id} = ${seed.plan.id}`);
    const inserted = await seedDemoData(tx);
    return { deleted: true, inserted };
  });
}
