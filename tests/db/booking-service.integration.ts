import { randomUUID } from "node:crypto";
import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
import {
  confirmBooking,
  createQuote,
  getAvailability,
  getConfirmation,
} from "../../src/lib/booking";
import * as schema from "../../src/db/schema";

const url = process.env.TEST_DATABASE_URL;
if (!url)
  throw new Error("Set TEST_DATABASE_URL to an isolated test database.");
if (new URL(url).hostname.includes("-pooler"))
  throw new Error(
    "TEST_DATABASE_URL must use a direct connection for migrations.",
  );

const secret = "booking-service-integration-secret-32-bytes-minimum";
const client = postgres(url, {
  max: 4,
  prepare: false,
  connect_timeout: 10,
  onnotice: () => {},
});
const db = drizzle(client, { schema });
const NOW = new Date("2026-11-03T08:00:00+05:30");
const dates = ["2026-11-10", "2026-11-11"];
const selection = (roomTypeId: string) => ({
  checkIn: dates[0],
  checkOut: "2026-11-12",
  adults: 1,
  children: 0,
  items: [{ roomTypeId, quantity: 1, adults: 1, children: 0 }],
});
const contact = { name: "Synthetic Guest", email: "guest@example.test" };

beforeAll(async () => {
  await migrate(db, { migrationsFolder: "./drizzle" });
});
afterAll(async () => {
  await client.end();
});

async function fixture(
  opts: { blackout?: boolean; allotment?: number; price?: number } = {},
) {
  const id = `booking-service-${randomUUID()}`;
  const plan = "standard-stay";
  await client`INSERT INTO rate_plans (id, name) VALUES (${plan}, 'Standard stay') ON CONFLICT (id) DO NOTHING`;
  await client`INSERT INTO room_types (id,name,description,capacity,physical_units,website_limit,base_rate_paise,image,image_alt)
    VALUES (${id},'Synthetic Estate','test fixture',2,1,1,900000,'/test.jpg','test')`;
  for (const day of dates) {
    await client`INSERT INTO nightly_inventory (room_type_id,stay_date,website_limit,allotment,booked,blackout)
      VALUES (${id},${day},1,${opts.allotment ?? 1},0,${opts.blackout ?? false})`;
    await client`INSERT INTO nightly_rates (room_type_id,rate_plan_id,stay_date,price_paise)
      VALUES (${id},${plan},${day},${opts.price ?? 900000})`;
  }
  return { id, plan };
}

async function cleanup(...ids: string[]) {
  await client.begin(async (tx) => {
    const owned =
      await tx`SELECT DISTINCT booking_id FROM booking_items WHERE room_type_id = ANY(${ids})`;
    await tx`DELETE FROM booking_nights WHERE room_type_id = ANY(${ids})`;
    await tx`DELETE FROM booking_items WHERE room_type_id = ANY(${ids})`;
    for (const row of owned)
      await tx`DELETE FROM bookings WHERE id=${row.booking_id}`;
    await tx`DELETE FROM nightly_rates WHERE room_type_id = ANY(${ids})`;
    await tx`DELETE FROM nightly_inventory WHERE room_type_id = ANY(${ids})`;
    await tx`DELETE FROM room_types WHERE id = ANY(${ids})`;
  });
}

async function quote(id: string) {
  return createQuote(db, selection(id), { now: NOW, secret });
}

describe("booking service transaction boundaries", () => {
  it("serializes a staff allotment reduction competing with a last-unit booking", async () => {
    const f = await fixture();
    const staff = postgres(url, { max: 1, prepare: false });
    const bookingClient = postgres(url, { max: 1, prepare: false });
    try {
      const q = await quote(f.id);
      const outcomes = await Promise.allSettled([
        confirmBooking(
          drizzle(bookingClient, { schema }),
          {
            selection: selection(f.id),
            contact,
            submissionId: randomUUID(),
            quoteToken: q.token,
            paymentOutcome: "success",
          },
          { now: NOW, secret },
        ),
        staff.begin(async (tx) => {
          // The staff API takes this same inventory lock before checking booked stock.
          const [row] =
            await tx`SELECT booked FROM nightly_inventory WHERE room_type_id=${f.id} AND stay_date=${dates[0]} FOR UPDATE`;
          if (Number(row.booked) > 0) throw new Error("STAFF_CONFLICT");
          await tx`UPDATE nightly_inventory SET allotment=0 WHERE room_type_id=${f.id} AND stay_date=${dates[0]}`;
        }),
      ]);
      expect(
        outcomes.filter((outcome) => outcome.status === "fulfilled"),
      ).toHaveLength(1);
      const rows =
        await client`SELECT booked,allotment FROM nightly_inventory WHERE room_type_id=${f.id} ORDER BY stay_date`;
      expect(
        rows.every((row) => Number(row.booked) <= Number(row.allotment)),
      ).toBe(true);
      if (outcomes[0].status === "fulfilled")
        expect(rows.map((row) => Number(row.booked))).toEqual([1, 1]);
      else {
        expect(outcomes[0].reason).toMatchObject({ code: "UNAVAILABLE" });
        expect(rows.map((row) => Number(row.booked))).toEqual([0, 0]);
        expect(Number(rows[0].allotment)).toBe(0);
      }
    } finally {
      await staff.end();
      await bookingClient.end();
      await cleanup(f.id);
    }
  });
  it("confirms the last available unit and leaves a durable snapshot", async () => {
    const f = await fixture();
    try {
      const q = await quote(f.id);
      const result = await confirmBooking(
        db,
        {
          selection: selection(f.id),
          contact,
          submissionId: randomUUID(),
          quoteToken: q.token,
          paymentOutcome: "success",
        },
        { now: NOW, secret },
      );
      expect(result.id).toMatch(/^[0-9a-f-]{36}$/);
      const saved = await getConfirmation(db, result.id);
      expect(saved.selection.items[0].roomTypeId).toBe(f.id);
      const rows =
        await client`SELECT booked FROM nightly_inventory WHERE room_type_id=${f.id}`;
      expect(rows.map((r) => Number(r.booked))).toEqual([1, 1]);
    } finally {
      await cleanup(f.id);
    }
  });

  it("does not write inventory or a booking when payment fails", async () => {
    const f = await fixture();
    try {
      const q = await quote(f.id);
      await expect(
        confirmBooking(
          db,
          {
            selection: selection(f.id),
            contact,
            submissionId: randomUUID(),
            quoteToken: q.token,
            paymentOutcome: "failure",
          },
          { now: NOW, secret },
        ),
      ).rejects.toMatchObject({ code: "PAYMENT_FAILED" });
      const rows =
        await client`SELECT booked FROM nightly_inventory WHERE room_type_id=${f.id}`;
      expect(rows.every((r) => Number(r.booked) === 0)).toBe(true);
    } finally {
      await cleanup(f.id);
    }
  });

  it("rejects a stale quote after a live rate change without reserving stock", async () => {
    const f = await fixture();
    try {
      const q = await quote(f.id);
      await client`UPDATE nightly_rates SET price_paise=999999 WHERE room_type_id=${f.id}`;
      await expect(
        confirmBooking(
          db,
          {
            selection: selection(f.id),
            contact,
            submissionId: randomUUID(),
            quoteToken: q.token,
            paymentOutcome: "success",
          },
          { now: NOW, secret },
        ),
      ).rejects.toMatchObject({ code: "QUOTE_CHANGED", status: 409 });
      const rows =
        await client`SELECT booked FROM nightly_inventory WHERE room_type_id=${f.id}`;
      expect(rows.every((r) => Number(r.booked) === 0)).toBe(true);
    } finally {
      await cleanup(f.id);
    }
  });

  it("returns the same booking for an identical submission retry", async () => {
    const f = await fixture();
    try {
      const q = await quote(f.id);
      const submissionId = randomUUID();
      const input = {
        selection: selection(f.id),
        contact,
        submissionId,
        quoteToken: q.token,
        paymentOutcome: "success" as const,
      };
      const first = await confirmBooking(db, input, { now: NOW, secret });
      const second = await confirmBooking(db, input, { now: NOW, secret });
      expect(second.id).toBe(first.id);
      const rows =
        await client`SELECT booked FROM nightly_inventory WHERE room_type_id=${f.id}`;
      expect(rows.map((r) => Number(r.booked))).toEqual([1, 1]);
    } finally {
      await cleanup(f.id);
    }
  });

  it("serializes competing submissions so exactly one gets the last unit", async () => {
    const f = await fixture();
    const a = postgres(url, { max: 1, prepare: false });
    const b = postgres(url, { max: 1, prepare: false });
    try {
      const qa = await quote(f.id);
      const qb = await quote(f.id);
      const da = drizzle(a, { schema });
      const db2 = drizzle(b, { schema });
      const results = await Promise.allSettled([
        confirmBooking(
          da,
          {
            selection: selection(f.id),
            contact,
            submissionId: randomUUID(),
            quoteToken: qa.token,
            paymentOutcome: "success",
          },
          { now: NOW, secret },
        ),
        confirmBooking(
          db2,
          {
            selection: selection(f.id),
            contact,
            submissionId: randomUUID(),
            quoteToken: qb.token,
            paymentOutcome: "success",
          },
          { now: NOW, secret },
        ),
      ]);
      expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
      expect(results.filter((r) => r.status === "rejected")).toHaveLength(1);
      const rejected = results.find((r) => r.status === "rejected");
      expect(rejected).toMatchObject({ reason: { code: "UNAVAILABLE" } });
      const rows =
        await client`SELECT booked FROM nightly_inventory WHERE room_type_id=${f.id}`;
      expect(rows.map((r) => Number(r.booked))).toEqual([1, 1]);
      const headers =
        await client`SELECT count(*)::int AS count FROM bookings WHERE submission_id IS NOT NULL AND request_fingerprint IS NOT NULL`;
      expect(Number(headers[0].count)).toBeGreaterThanOrEqual(1);
    } finally {
      await a.end();
      await b.end();
      await cleanup(f.id);
    }
  });

  it("rejects a changed body for an existing submission", async () => {
    const f = await fixture();
    try {
      const q = await quote(f.id);
      const submissionId = randomUUID();
      const input = {
        selection: selection(f.id),
        contact,
        submissionId,
        quoteToken: q.token,
        paymentOutcome: "success" as const,
      };
      await confirmBooking(db, input, { now: NOW, secret });
      await expect(
        confirmBooking(
          db,
          { ...input, contact: { ...contact, name: "Another Guest" } },
          { now: NOW, secret },
        ),
      ).rejects.toMatchObject({ code: "IDEMPOTENCY_CONFLICT", status: 409 });
    } finally {
      await cleanup(f.id);
    }
  });

  it("rejects tampered and expired quote tokens with specific codes", async () => {
    const f = await fixture();
    try {
      const q = await quote(f.id);
      await expect(
        confirmBooking(
          db,
          {
            selection: selection(f.id),
            contact,
            submissionId: randomUUID(),
            quoteToken: `${q.token}x`,
            paymentOutcome: "success",
          },
          { now: NOW, secret },
        ),
      ).rejects.toMatchObject({ code: "INVALID_QUOTE" });
      await expect(
        confirmBooking(
          db,
          {
            selection: selection(f.id),
            contact,
            submissionId: randomUUID(),
            quoteToken: q.token,
            paymentOutcome: "success",
          },
          { now: new Date(NOW.getTime() + 16 * 60000), secret },
        ),
      ).rejects.toMatchObject({ code: "QUOTE_EXPIRED" });
    } finally {
      await cleanup(f.id);
    }
  });

  it.each(["blackout", "missing-rate"] as const)(
    "rolls back every room in a mixed booking when the final night is %s",
    async (variant) => {
      const left = await fixture();
      const right = await fixture();
      const mixed = {
        checkIn: dates[0],
        checkOut: "2026-11-12",
        adults: 2,
        children: 0,
        items: [
          { roomTypeId: left.id, quantity: 1, adults: 1, children: 0 },
          { roomTypeId: right.id, quantity: 1, adults: 1, children: 0 },
        ],
      };
      try {
        const q = await createQuote(db, mixed, { now: NOW, secret });
        if (variant === "blackout")
          await client`UPDATE nightly_inventory SET blackout=true WHERE room_type_id=${right.id} AND stay_date='2026-11-11'`;
        else
          await client`DELETE FROM nightly_rates WHERE room_type_id=${right.id} AND stay_date='2026-11-11'`;
        await expect(
          confirmBooking(
            db,
            {
              selection: mixed,
              contact,
              submissionId: randomUUID(),
              quoteToken: q.token,
              paymentOutcome: "success",
            },
            { now: NOW, secret },
          ),
        ).rejects.toMatchObject({
          code: variant === "blackout" ? "UNAVAILABLE" : "MISSING_RATE",
        });
        const rows =
          await client`SELECT room_type_id, booked FROM nightly_inventory WHERE room_type_id IN (${left.id}, ${right.id}) ORDER BY room_type_id, stay_date`;
        expect(rows.every((row) => Number(row.booked) === 0)).toBe(true);
      } finally {
        await cleanup(left.id, right.id);
      }
    },
  );

  it("makes identical concurrent retries one booking", async () => {
    const f = await fixture();
    const a = postgres(url, { max: 1, prepare: false });
    const b = postgres(url, { max: 1, prepare: false });
    try {
      const q = await quote(f.id);
      const input = {
        selection: selection(f.id),
        contact,
        submissionId: randomUUID(),
        quoteToken: q.token,
        paymentOutcome: "success" as const,
      };
      const [one, two] = await Promise.all([
        confirmBooking(drizzle(a, { schema }), input, { now: NOW, secret }),
        confirmBooking(drizzle(b, { schema }), input, { now: NOW, secret }),
      ]);
      expect(one.id).toBe(two.id);
      const count =
        await client`SELECT count(*)::int AS count FROM bookings WHERE submission_id=${input.submissionId}`;
      expect(Number(count[0].count)).toBe(1);
      const rows =
        await client`SELECT booked FROM nightly_inventory WHERE room_type_id=${f.id}`;
      expect(rows.map((r) => Number(r.booked))).toEqual([1, 1]);
    } finally {
      await a.end();
      await b.end();
      await cleanup(f.id);
    }
  });

  it("keeps confirmation snapshots immutable and excludes contact PII", async () => {
    const f = await fixture();
    try {
      const q = await quote(f.id);
      const result = await confirmBooking(
        db,
        {
          selection: selection(f.id),
          contact,
          submissionId: randomUUID(),
          quoteToken: q.token,
          paymentOutcome: "success",
        },
        { now: NOW, secret },
      );
      await client`UPDATE room_types SET name='Mutated room' WHERE id=${f.id}`;
      await client`UPDATE nightly_rates SET price_paise=999999 WHERE room_type_id=${f.id}`;
      const saved = await getConfirmation(db, result.id);
      expect(saved.selection.items[0].roomTypeId).toBe(f.id);
      expect(saved.nights[0].unitPricePaise).toBe(900000);
      expect(saved).not.toHaveProperty("contactName");
      expect(saved).not.toHaveProperty("contactEmail");
      expect(saved).not.toHaveProperty("contactPhone");
      expect(saved).not.toHaveProperty("submissionId");
      expect(saved).not.toHaveProperty("requestFingerprint");
    } finally {
      await cleanup(f.id);
    }
  });

  it("reports checkout-excluded availability reasons for missing inventory, rates, blackout, and sold out stock", async () => {
    const missingInventory = await fixture();
    const missingRate = await fixture();
    const blackout = await fixture({ blackout: true });
    const soldOut = await fixture({ allotment: 0 });
    try {
      await client`DELETE FROM nightly_inventory WHERE room_type_id=${missingInventory.id} AND stay_date='2026-11-11'`;
      await client`DELETE FROM nightly_rates WHERE room_type_id=${missingRate.id} AND stay_date='2026-11-11'`;
      const result = await getAvailability(
        db,
        { checkIn: "2026-11-10", checkOut: "2026-11-12" },
        { now: NOW },
      );
      const byId = new Map(result.rooms.map((room) => [room.roomTypeId, room]));
      expect(byId.get(missingInventory.id)).toMatchObject({
        available: 0,
        reason: "Inventory is not configured for every night.",
      });
      expect(byId.get(missingRate.id)).toMatchObject({
        available: 0,
        reason: "Price unavailable for one or more nights.",
      });
      expect(byId.get(blackout.id)).toMatchObject({
        available: 0,
        reason: "Blackout dates stop new bookings.",
      });
      expect(byId.get(soldOut.id)).toMatchObject({
        available: 0,
        reason: "Sold out for one or more nights.",
      });
      const checkoutExcluded = await getAvailability(
        db,
        { checkIn: "2026-11-10", checkOut: "2026-11-11" },
        { now: NOW },
      );
      expect(checkoutExcluded.nights).toEqual(["2026-11-10"]);
      expect(
        checkoutExcluded.rooms.find(
          (room) => room.roomTypeId === missingInventory.id,
        )?.available,
      ).toBe(1);
      expect(
        checkoutExcluded.rooms.find(
          (room) => room.roomTypeId === missingRate.id,
        )?.available,
      ).toBe(1);
    } finally {
      await cleanup(
        missingInventory.id,
        missingRate.id,
        blackout.id,
        soldOut.id,
      );
    }
  });
});
