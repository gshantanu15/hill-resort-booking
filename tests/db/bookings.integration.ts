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

const rollback = new Error("Roll back synthetic booking fixture");
async function fixture(
  run: (
    tx: postgres.TransactionSql,
    roomId: string,
    otherRoomId: string,
    planId: string,
  ) => Promise<void>,
) {
  try {
    await client.begin(async (tx) => {
      const room = sampleRooms[0];
      const other = sampleRooms[1];
      const roomId = `booking-test-${randomUUID()}`;
      const otherRoomId = `${roomId}-other`;
      const planId = `booking-plan-${randomUUID()}`;
      await tx`INSERT INTO room_types (id, name, description, capacity, base_rate_paise, image, image_alt, physical_units, website_limit)
        VALUES (${roomId}, ${room.name}, ${room.description}, ${room.capacity}, ${room.baseRatePaise}, ${room.image}, ${room.imageAlt}, 20, 10),
          (${otherRoomId}, ${other.name}, ${other.description}, ${other.capacity}, ${other.baseRatePaise}, ${other.image}, ${other.imageAlt}, 20, 10)`;
      await tx`INSERT INTO rate_plans (id, name) VALUES (${planId}, 'Standard stay')`;
      await run(tx, roomId, otherRoomId, planId);
      throw rollback;
    });
  } catch (error) {
    if (error !== rollback) throw error;
  }
}

async function insertBooking(
  tx: postgres.TransactionSql,
  planId: string,
  overrides: Record<string, unknown> = {},
) {
  const values = {
    submissionId: randomUUID(),
    fingerprint: "a".repeat(64),
    name: "Synthetic Guest",
    email: "guest@example.test",
    phone: null,
    checkIn: "2026-11-10",
    checkOut: "2026-11-12",
    adults: 2,
    children: 1,
    planName: "Standard stay",
    ...overrides,
  };
  const [row] = await tx`INSERT INTO bookings
    (submission_id, request_fingerprint, contact_name, contact_email, contact_phone,
     check_in, check_out, adults, children, rate_plan_id, rate_plan_name)
    VALUES (${values.submissionId}, ${values.fingerprint}, ${values.name}, ${values.email}, ${values.phone},
      ${values.checkIn}, ${values.checkOut}, ${values.adults}, ${values.children}, ${planId}, ${values.planName})
    RETURNING id, submission_id, created_at`;
  return row;
}

async function insertItem(
  tx: postgres.TransactionSql,
  bookingId: string,
  roomId: string,
  roomName = "Estate room",
  quantity = 2,
  adults = 2,
  children = 1,
) {
  await tx`INSERT INTO booking_items
    (booking_id, room_type_id, room_type_name, quantity, adults, children)
    VALUES (${bookingId}, ${roomId}, ${roomName}, ${quantity}, ${adults}, ${children})`;
}

async function insertNight(
  tx: postgres.TransactionSql,
  bookingId: string,
  roomId: string,
  day: string,
  values: {
    unitPrice?: number;
    subtotal?: number;
    tax?: number;
    total?: number;
    taxRate?: number;
    includesTax?: boolean;
  } = {},
) {
  const unitPrice = values.unitPrice ?? 850000;
  const subtotal = values.subtotal ?? unitPrice * 2;
  const tax = values.tax ?? 0;
  const total = values.total ?? subtotal + tax;
  await tx`INSERT INTO booking_nights
    (booking_id, room_type_id, stay_date, unit_price_paise, subtotal_paise, tax_paise,
     total_paise, tax_rate_bps, rate_includes_tax)
    VALUES (${bookingId}, ${roomId}, ${day}, ${unitPrice}, ${subtotal}, ${tax},
      ${total}, ${values.taxRate ?? 0}, ${values.includesTax ?? false})`;
}

describe("booking storage database contract", () => {
  it("stores mixed booking records with defaults and structured nightly snapshots", async () => {
    await fixture(async (tx, roomId, otherRoomId, planId) => {
      const booking = await insertBooking(tx, planId, {
        adults: 3,
        children: 1,
      });
      expect(booking.id).toMatch(/^[0-9a-f-]{36}$/);
      expect(booking.submission_id).toMatch(/^[0-9a-f-]{36}$/);
      expect(booking.created_at).toBeTruthy();
      await insertItem(tx, booking.id, roomId, "Estate room", 2, 2, 1);
      await insertItem(tx, booking.id, otherRoomId, "Garden room", 1, 1, 0);
      // Synthetic rates exercise storage, not the still-undecided tax policy.
      for (const day of ["2026-11-10", "2026-11-11"]) {
        await insertNight(tx, booking.id, roomId, day, {
          unitPrice: 850000,
          subtotal: 1700000,
          tax: 170000,
          total: 1870000,
          taxRate: 1000,
        });
        await insertNight(tx, booking.id, otherRoomId, day, {
          unitPrice: 1050000,
          subtotal: 875000,
          tax: 175000,
          total: 1050000,
          taxRate: 2000,
          includesTax: true,
        });
      }
      const items =
        await tx`SELECT room_type_id, quantity, adults, children FROM booking_items WHERE booking_id = ${booking.id} ORDER BY room_type_id`;
      const nights =
        await tx`SELECT room_type_id, unit_price_paise, subtotal_paise, tax_paise, total_paise, tax_rate_bps, rate_includes_tax FROM booking_nights WHERE booking_id = ${booking.id} ORDER BY room_type_id`;
      expect(items).toHaveLength(2);
      expect(items).toEqual([
        expect.objectContaining({ adults: 2, children: 1, quantity: 2 }),
        expect.objectContaining({ adults: 1, children: 0, quantity: 1 }),
      ]);
      expect(nights).toHaveLength(4);
      expect(
        nights.reduce((sum, night) => sum + Number(night.total_paise), 0),
      ).toBe(5840000);
      expect(
        nights.every(
          (night) =>
            Number(night.total_paise) ===
            Number(night.subtotal_paise) + Number(night.tax_paise),
        ),
      ).toBe(true);
      const [saved] =
        await tx`SELECT contact_phone FROM bookings WHERE id = ${booking.id}`;
      expect(saved.contact_phone).toBeNull();
    });
  });

  it("preserves snapshots when live catalogue, plan, and rate records change or disappear", async () => {
    await fixture(async (tx, roomId, _otherRoomId, planId) => {
      const booking = await insertBooking(tx, planId);
      await insertItem(tx, booking.id, roomId, "Estate room");
      await insertNight(tx, booking.id, roomId, "2026-11-10", {
        tax: 153000,
        total: 1853000,
        subtotal: 1700000,
        taxRate: 900,
      });
      await tx`INSERT INTO nightly_rates (room_type_id, rate_plan_id, stay_date, price_paise)
        VALUES (${roomId}, ${planId}, '2026-11-10', 850000)`;
      await tx`UPDATE room_types SET name = 'Renamed room' WHERE id = ${roomId}`;
      await tx`UPDATE rate_plans SET name = 'Changed plan' WHERE id = ${planId}`;
      await tx`UPDATE nightly_rates SET price_paise = 999999 WHERE room_type_id = ${roomId}`;
      await tx`DELETE FROM nightly_rates WHERE room_type_id = ${roomId}`;
      const [item] =
        await tx`SELECT room_type_name FROM booking_items WHERE booking_id = ${booking.id}`;
      const [savedBooking] =
        await tx`SELECT rate_plan_name FROM bookings WHERE id = ${booking.id}`;
      const [night] =
        await tx`SELECT unit_price_paise, tax_paise, total_paise, tax_rate_bps, rate_includes_tax FROM booking_nights WHERE booking_id = ${booking.id}`;
      expect(item.room_type_name).toBe("Estate room");
      expect(savedBooking.rate_plan_name).toBe("Standard stay");
      expect(night).toMatchObject({
        unit_price_paise: 850000,
        tax_paise: 153000,
        total_paise: 1853000,
        tax_rate_bps: 900,
        rate_includes_tax: false,
      });
    });
  });

  it.each([
    ["duplicate submission", "submission_id", "23505"],
    ["duplicate item", "item", "23505"],
    ["duplicate nightly snapshot", "night", "23505"],
  ])("rejects %s", async (_label, kind, code) => {
    await expect(
      fixture(async (tx, roomId, _otherRoomId, planId) => {
        const booking = await insertBooking(tx, planId);
        if (kind === "submission_id") {
          await tx`INSERT INTO bookings (submission_id, request_fingerprint, contact_name, contact_email, check_in, check_out, adults, children, rate_plan_id, rate_plan_name)
          VALUES (${booking.submission_id}, ${"b".repeat(64)}, 'Other', 'other@example.test', '2026-11-10', '2026-11-11', 1, 0, ${planId}, 'Standard stay')`;
        } else {
          await insertItem(tx, booking.id, roomId);
          if (kind === "item") await insertItem(tx, booking.id, roomId);
          else {
            await insertNight(tx, booking.id, roomId, "2026-11-10");
            await insertNight(tx, booking.id, roomId, "2026-11-10");
          }
        }
      }),
    ).rejects.toMatchObject({ code });
  });

  it.each([
    [
      "checkout not after check-in",
      { checkIn: "2026-11-12", checkOut: "2026-11-12" },
      "23514",
    ],
    ["blank contact name", { name: "   " }, "23514"],
    ["blank email", { email: "   " }, "23514"],
    ["blank phone", { phone: "   " }, "23514"],
    ["blank plan snapshot name", { planName: "   " }, "23514"],
    ["invalid fingerprint", { fingerprint: "abc" }, "23514"],
    ["negative adults", { adults: -1 }, "23514"],
    ["negative children", { children: -1 }, "23514"],
    ["zero total guests", { adults: 0, children: 0 }, "23514"],
    ["null contact name", { name: null }, "23502"],
    ["null email", { email: null }, "23502"],
    ["null submission identifier", { submissionId: null }, "23502"],
    ["null fingerprint", { fingerprint: null }, "23502"],
    ["null check-in", { checkIn: null }, "23502"],
  ])("rejects %s", async (_label, overrides, code) => {
    await expect(
      fixture(async (tx, roomId, _otherRoomId, planId) => {
        await insertBooking(tx, planId, overrides);
      }),
    ).rejects.toMatchObject({ code });
  });

  it.each([
    ["blank room snapshot name", { roomName: "   " }, "23514"],
    ["zero quantity", { quantity: 0 }, "23514"],
    ["fractional quantity", { quantity: 1.5 }, "22P02"],
    ["negative item adults", { adults: -1 }, "23514"],
    ["negative item children", { children: -1 }, "23514"],
  ] as [string, Record<string, number | string>, string][])(
    "rejects %s",
    async (_label, values, code) => {
      await expect(
        fixture(async (tx, roomId, _otherRoomId, planId) => {
          const booking = await insertBooking(tx, planId);
          await insertItem(
            tx,
            booking.id,
            roomId,
            typeof values.roomName === "string"
              ? values.roomName
              : "Estate room",
            typeof values.quantity === "number" ? values.quantity : 2,
            typeof values.adults === "number" ? values.adults : 2,
            typeof values.children === "number" ? values.children : 1,
          );
        }),
      ).rejects.toMatchObject({ code });
    },
  );

  it.each([
    ["zero unit price", { unitPrice: 0 }, "23514"],
    ["negative unit price", { unitPrice: -1 }, "23514"],
    ["fractional unit price", { unitPrice: 1.5 }, "22P02"],
    ["negative subtotal", { subtotal: -1 }, "23514"],
    ["negative tax", { tax: -1 }, "23514"],
    ["zero total", { total: 0 }, "23514"],
    ["negative tax rate", { taxRate: -1 }, "23514"],
    ["inconsistent total", { subtotal: 100, tax: 50, total: 100 }, "23514"],
  ])("rejects %s", async (_label, values, code) => {
    await expect(
      fixture(async (tx, roomId, _otherRoomId, planId) => {
        const booking = await insertBooking(tx, planId);
        await insertItem(tx, booking.id, roomId);
        await insertNight(tx, booking.id, roomId, "2026-11-10", values);
      }),
    ).rejects.toMatchObject({ code });
  });

  it("rejects a duplicate booking ID", async () => {
    await expect(
      fixture(async (tx, _roomId, _otherRoomId, planId) => {
        const booking = await insertBooking(tx, planId);
        await tx`INSERT INTO bookings (id, submission_id, request_fingerprint, contact_name, contact_email, check_in, check_out, adults, children, rate_plan_id, rate_plan_name)
          VALUES (${booking.id}, ${randomUUID()}, ${"b".repeat(64)}, 'Synthetic Guest', 'other@example.test', '2026-11-10', '2026-11-11', 1, 0, ${planId}, 'Standard stay')`;
      }),
    ).rejects.toMatchObject({ code: "23505" });
  });

  it.each([
    [
      "nightly unit price",
      "subtotal_paise, tax_paise, total_paise, tax_rate_bps, rate_includes_tax",
      "850000, 0, 850000, 0, false",
    ],
    [
      "tax inclusion flag",
      "unit_price_paise, subtotal_paise, tax_paise, total_paise, tax_rate_bps",
      "850000, 850000, 0, 850000, 0",
    ],
  ])("requires an explicit %s", async (_label, columns, values) => {
    await expect(
      fixture(async (tx, roomId, _otherRoomId, planId) => {
        const booking = await insertBooking(tx, planId);
        await insertItem(tx, booking.id, roomId);
        await tx.unsafe(
          `INSERT INTO booking_nights (booking_id, room_type_id, stay_date, ${columns}) VALUES ($1, $2, '2026-11-10', ${values})`,
          [booking.id, roomId],
        );
      }),
    ).rejects.toMatchObject({ code: "23502" });
  });

  it("rejects orphan items, orphan nights, and restricted deletion of referenced records", async () => {
    await expect(
      fixture(async (tx, roomId) => {
        await tx`INSERT INTO booking_items (booking_id, room_type_id, room_type_name, quantity, adults, children)
        VALUES (${randomUUID()}, ${roomId}, 'Estate room', 1, 1, 0)`;
      }),
    ).rejects.toMatchObject({ code: "23503" });
    await expect(
      fixture(async (tx) => {
        await tx`INSERT INTO bookings (submission_id, request_fingerprint, contact_name, contact_email, check_in, check_out, adults, children, rate_plan_id, rate_plan_name)
          VALUES (${randomUUID()}, ${"c".repeat(64)}, 'Synthetic Guest', 'guest@example.test', '2026-11-10', '2026-11-11', 1, 0, 'unknown-plan', 'Unknown')`;
      }),
    ).rejects.toMatchObject({ code: "23503" });
    await expect(
      fixture(async (tx, _roomId, _otherRoomId, planId) => {
        const booking = await insertBooking(tx, planId);
        await tx`INSERT INTO booking_items (booking_id, room_type_id, room_type_name, quantity, adults, children)
          VALUES (${booking.id}, 'unknown-room', 'Unknown', 1, 1, 0)`;
      }),
    ).rejects.toMatchObject({ code: "23503" });
    await expect(
      fixture(async (tx, roomId, _otherRoomId, planId) => {
        const booking = await insertBooking(tx, planId);
        await tx`INSERT INTO booking_nights (booking_id, room_type_id, stay_date, unit_price_paise, subtotal_paise, tax_paise, total_paise, tax_rate_bps, rate_includes_tax)
        VALUES (${booking.id}, ${roomId}, '2026-11-10', 850000, 850000, 0, 850000, 0, false)`;
      }),
    ).rejects.toMatchObject({ code: "23503" });
    await expect(
      fixture(async (tx, roomId, otherRoomId, planId) => {
        const booking = await insertBooking(tx, planId);
        await insertItem(tx, booking.id, roomId);
        await tx`INSERT INTO booking_nights (booking_id, room_type_id, stay_date, unit_price_paise, subtotal_paise, tax_paise, total_paise, tax_rate_bps, rate_includes_tax)
          VALUES (${booking.id}, ${otherRoomId}, '2026-11-10', 850000, 850000, 0, 850000, 0, false)`;
      }),
    ).rejects.toMatchObject({ code: "23503" });
    for (const target of ["booking", "room", "plan"] as const) {
      await expect(
        fixture(async (tx, roomId, _otherRoomId, planId) => {
          const booking = await insertBooking(tx, planId);
          await insertItem(tx, booking.id, roomId);
          await insertNight(tx, booking.id, roomId, "2026-11-10");
          if (target === "booking")
            await tx`DELETE FROM bookings WHERE id = ${booking.id}`;
          if (target === "room")
            await tx`DELETE FROM room_types WHERE id = ${roomId}`;
          if (target === "plan")
            await tx`DELETE FROM rate_plans WHERE id = ${planId}`;
        }),
      ).rejects.toMatchObject({ code: "23001" });
    }
    await expect(
      fixture(async (tx, roomId, _otherRoomId, planId) => {
        const booking = await insertBooking(tx, planId);
        await insertItem(tx, booking.id, roomId);
        await insertNight(tx, booking.id, roomId, "2026-11-10");
        await tx`DELETE FROM booking_items WHERE booking_id = ${booking.id} AND room_type_id = ${roomId}`;
      }),
    ).rejects.toMatchObject({ code: "23001" });
  });
});
