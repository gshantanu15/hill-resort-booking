import { randomUUID } from "node:crypto";
import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { sampleRooms } from "../../src/db/sample-rooms";

// Explicit opt-in: never fall back to the application's development/demo URL.
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

const rollback = new Error("Roll back synthetic fixture");
async function fixture(
  run: (tx: postgres.TransactionSql, roomId: string) => Promise<void>,
) {
  try {
    await client.begin(async (tx) => {
      const roomId = `inventory-test-${randomUUID()}`;
      const room = sampleRooms[0];
      await tx`INSERT INTO room_types (id, name, description, capacity, base_rate_paise, image, image_alt)
        VALUES (${roomId}, ${room.name}, ${room.description}, ${room.capacity}, ${room.baseRatePaise}, ${room.image}, ${room.imageAlt})`;
      await run(tx, roomId);
      throw rollback;
    });
  } catch (error) {
    if (error !== rollback) throw error;
  }
}

describe("nightly inventory database contract", () => {
  it("defaults booked to zero and permits independent room-type/night records", async () => {
    await fixture(async (tx, roomId) => {
      const otherRoomId = `${roomId}-other`;
      await tx`INSERT INTO room_types SELECT ${otherRoomId}, name, description, capacity, base_rate_paise, image, image_alt FROM room_types WHERE id = ${roomId}`;
      const rows =
        await tx`INSERT INTO nightly_inventory (room_type_id, stay_date, allotment, blackout) VALUES
        (${roomId}, '2026-11-10', 5, false),
        (${roomId}, '2026-11-11', 0, false),
        (${otherRoomId}, '2026-11-10', 2, false)
        RETURNING booked, stay_date::text`;
      expect(rows).toHaveLength(3);
      expect(rows.map((row) => row.booked)).toEqual([0, 0, 0]);
      expect(rows[0].stay_date).toBe("2026-11-10");
    });
  });

  const invalidRows: [string, string, (number | boolean | null)[], string][] = [
    [
      "negative allotment",
      "allotment, booked, blackout",
      [-1, 0, false],
      "23514",
    ],
    [
      "negative booked count",
      "allotment, booked, blackout",
      [5, -1, false],
      "23514",
    ],
    [
      "booked above allotment",
      "allotment, booked, blackout",
      [1, 2, false],
      "23514",
    ],
    [
      "fractional allotment parameter",
      "allotment, booked, blackout",
      [1.5, 0, false],
      "22P02",
    ],
    [
      "fractional booked parameter",
      "allotment, booked, blackout",
      [5, 1.5, false],
      "22P02",
    ],
    ["missing allotment", "booked, blackout", [0, false], "23502"],
    ["missing blackout", "allotment, booked", [5, 0], "23502"],
    [
      "null allotment",
      "allotment, booked, blackout",
      [null, 0, false],
      "23502",
    ],
    [
      "null booked count",
      "allotment, booked, blackout",
      [5, null, false],
      "23502",
    ],
    ["null blackout", "allotment, booked, blackout", [5, 0, null], "23502"],
  ];
  it.each(invalidRows)("rejects %s", async (_label, columns, values, code) => {
    await expect(
      fixture(async (tx, roomId) => {
        const placeholders = values.map((_, i) => `$${i + 3}`).join(", ");
        await tx.unsafe(
          `INSERT INTO nightly_inventory (room_type_id, stay_date, ${columns}) VALUES ($1, $2, ${placeholders})`,
          [roomId, "2026-11-10", ...values],
        );
      }),
    ).rejects.toMatchObject({ code });
  });

  it.each([
    ["unknown room type", "missing-room", "2026-11-10", "23503"],
    ["null room type", null, "2026-11-10", "23502"],
    ["null stay date", "fixture", null, "23502"],
    ["invalid calendar date", "fixture", "2026-02-30", "22008"],
  ])("rejects %s", async (_label, room, day, code) => {
    await expect(
      fixture(async (tx, roomId) => {
        await tx`INSERT INTO nightly_inventory (room_type_id, stay_date, allotment, blackout)
        VALUES (${room === "fixture" ? roomId : room}, ${day}, 5, false)`;
      }),
    ).rejects.toMatchObject({ code });
  });

  it.each([
    [
      "duplicate type/night",
      "INSERT INTO nightly_inventory SELECT * FROM nightly_inventory WHERE room_type_id = $1",
      "23505",
    ],
    [
      "allotment below booked stock",
      "UPDATE nightly_inventory SET allotment = 1 WHERE room_type_id = $1",
      "23514",
    ],
    [
      "deletion of a room type with inventory",
      "DELETE FROM room_types WHERE id = $1",
      "23001",
    ],
  ])("rejects %s", async (_label, statement, code) => {
    await expect(
      fixture(async (tx, roomId) => {
        await tx`INSERT INTO nightly_inventory (room_type_id, stay_date, allotment, booked, blackout)
        VALUES (${roomId}, '2026-11-10', 2, 2, false)`;
        await tx.unsafe(statement, [roomId]);
      }),
    ).rejects.toMatchObject({ code });
  });

  it("allows blackout on fully booked stock without changing booked quantities", async () => {
    await fixture(async (tx, roomId) => {
      await tx`INSERT INTO nightly_inventory (room_type_id, stay_date, allotment, booked, blackout)
        VALUES (${roomId}, '2026-11-10', 2, 2, false)`;
      const [row] = await tx`UPDATE nightly_inventory SET blackout = true
        WHERE room_type_id = ${roomId} RETURNING allotment, booked, blackout`;
      expect(row).toMatchObject({ allotment: 2, booked: 2, blackout: true });
      const absent = await tx`SELECT * FROM nightly_inventory
        WHERE room_type_id = ${roomId} AND stay_date = '2026-11-12'`;
      expect(absent).toHaveLength(0);
    });
  });
});
