import { randomUUID } from "node:crypto";
import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { sampleRooms } from "../../src/db/sample-rooms";

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
beforeAll(async () => {
  await migrate(drizzle(client), { migrationsFolder: "./drizzle" });
});
afterAll(async () => {
  await client.end();
});

const rollback = new Error("Roll back synthetic rate fixture");
async function fixture(
  run: (
    tx: postgres.TransactionSql,
    roomId: string,
    planId: string,
  ) => Promise<void>,
) {
  try {
    await client.begin(async (tx) => {
      const roomId = `rates-test-${randomUUID()}`;
      const planId = `plan-${randomUUID()}`;
      const room = sampleRooms[0];
      await tx`INSERT INTO room_types (id, name, description, capacity, base_rate_paise, image, image_alt)
        VALUES (${roomId}, ${room.name}, ${room.description}, ${room.capacity}, ${room.baseRatePaise}, ${room.image}, ${room.imageAlt})`;
      await tx`INSERT INTO rate_plans (id, name) VALUES (${planId}, 'Standard stay')`;
      await run(tx, roomId, planId);
      throw rollback;
    });
  } catch (error) {
    if (error !== rollback) throw error;
  }
}

describe("rate storage database contract", () => {
  it.each([
    ["null plan ID", null, "Standard stay", "23502"],
    ["empty plan ID", "", "Standard stay", "23514"],
    ["whitespace plan ID", " \t\n", "Standard stay", "23514"],
    ["null plan name", "new-plan", null, "23502"],
    ["empty plan name", "new-plan", "", "23514"],
    ["whitespace plan name", "new-plan", " \t\n", "23514"],
  ])("rejects %s", async (_label, id, name, code) => {
    await expect(
      fixture(async (tx) => {
        await tx`INSERT INTO rate_plans (id, name) VALUES (${id}, ${name})`;
      }),
    ).rejects.toMatchObject({ code });
  });

  const invalidRates: [
    string,
    string | null,
    string | null,
    string | null,
    number | null,
    string,
  ][] = [
    ["unknown room type", "unknown", "fixture", "2026-11-10", 850000, "23503"],
    ["null room type", null, "fixture", "2026-11-10", 850000, "23502"],
    ["unknown rate plan", "fixture", "unknown", "2026-11-10", 850000, "23503"],
    ["null rate plan", "fixture", null, "2026-11-10", 850000, "23502"],
    ["null date", "fixture", "fixture", null, 850000, "23502"],
    [
      "invalid calendar date",
      "fixture",
      "fixture",
      "2026-02-30",
      850000,
      "22008",
    ],
    ["null price", "fixture", "fixture", "2026-11-10", null, "23502"],
    ["zero price", "fixture", "fixture", "2026-11-10", 0, "23514"],
    ["negative price", "fixture", "fixture", "2026-11-10", -1, "23514"],
    [
      "fractional paise parameter",
      "fixture",
      "fixture",
      "2026-11-10",
      1.5,
      "22P02",
    ],
  ];
  it.each(invalidRates)(
    "rejects %s",
    async (_label, room, plan, day, price, code) => {
      await expect(
        fixture(async (tx, roomId, planId) => {
          await tx`INSERT INTO nightly_rates (room_type_id, rate_plan_id, stay_date, price_paise)
        VALUES (${room === "fixture" ? roomId : room}, ${plan === "fixture" ? planId : plan}, ${day}, ${price})`;
        }),
      ).rejects.toMatchObject({ code });
    },
  );

  it("requires an explicit price rather than inheriting the catalogue guide", async () => {
    await expect(
      fixture(async (tx, roomId, planId) => {
        await tx`INSERT INTO nightly_rates (room_type_id, rate_plan_id, stay_date)
        VALUES (${roomId}, ${planId}, '2026-11-10')`;
      }),
    ).rejects.toMatchObject({ code: "23502" });
  });

  it.each([
    [
      "duplicate type/plan/night",
      "INSERT INTO nightly_rates SELECT * FROM nightly_rates WHERE room_type_id = $1",
      "room",
      "23505",
    ],
    [
      "room deletion with rates",
      "DELETE FROM room_types WHERE id = $1",
      "room",
      "23001",
    ],
    [
      "plan deletion with rates",
      "DELETE FROM rate_plans WHERE id = $1",
      "plan",
      "23001",
    ],
    [
      "changing a price to zero",
      "UPDATE nightly_rates SET price_paise = 0 WHERE room_type_id = $1",
      "room",
      "23514",
    ],
  ])("rejects %s", async (_label, statement, target, code) => {
    await expect(
      fixture(async (tx, roomId, planId) => {
        await tx`INSERT INTO nightly_rates (room_type_id, rate_plan_id, stay_date, price_paise)
        VALUES (${roomId}, ${planId}, '2026-11-10', 850000)`;
        await tx.unsafe(statement, [target === "plan" ? planId : roomId]);
      }),
    ).rejects.toMatchObject({ code });
  });

  it("stores independent nightly amounts without inventory or catalogue side effects", async () => {
    await fixture(async (tx, roomId, planId) => {
      const otherRoomId = `${roomId}-other`;
      await tx`INSERT INTO room_types SELECT ${otherRoomId}, name, description, capacity, base_rate_paise, image, image_alt
        FROM room_types WHERE id = ${roomId}`;
      const rows =
        await tx`INSERT INTO nightly_rates (room_type_id, rate_plan_id, stay_date, price_paise) VALUES
        (${roomId}, ${planId}, '2026-11-10', 850001),
        (${roomId}, ${planId}, '2026-11-11', 950000),
        (${otherRoomId}, ${planId}, '2026-11-10', 1050000)
        RETURNING price_paise, stay_date::text`;
      expect(rows.map((row) => row.price_paise)).toEqual([
        850001, 950000, 1050000,
      ]);
      expect(rows[0].stay_date).toBe("2026-11-10");
      await tx`UPDATE nightly_rates SET price_paise = 900000
        WHERE room_type_id = ${roomId} AND stay_date = '2026-11-10'`;
      const [room] =
        await tx`SELECT base_rate_paise FROM room_types WHERE id = ${roomId}`;
      expect(room.base_rate_paise).toBe(sampleRooms[0].baseRatePaise);
      const inventory =
        await tx`SELECT * FROM nightly_inventory WHERE room_type_id = ${roomId}`;
      expect(inventory).toHaveLength(0);
      const absent =
        await tx`SELECT * FROM nightly_rates WHERE room_type_id = ${roomId} AND stay_date = '2026-11-12'`;
      expect(absent).toHaveLength(0);
    });
  });

  it("rejects duplicate rate-plan identifiers", async () => {
    await expect(
      fixture(async (tx, _roomId, planId) => {
        await tx`INSERT INTO rate_plans (id, name) VALUES (${planId}, 'Standard stay')`;
      }),
    ).rejects.toMatchObject({ code: "23505" });
  });
});
