import { existsSync, readFileSync } from "node:fs";
import postgres from "postgres";
import { parse } from "dotenv";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { eq, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import * as schema from "../../src/db/schema";
import { createDemoSeed } from "../../src/db/demo-seed";
import { resetDemoDatabase } from "../../src/db/reset-demo";

const url = process.env.TEST_DATABASE_URL;
if (!url)
  throw new Error("Set TEST_DATABASE_URL for the isolated reset test branch.");
const parsed = new URL(url);
if (
  parsed.hostname !==
    "ep-small-bar-aopct83h.c-2.ap-southeast-1.aws.neon.tech" ||
  parsed.hostname.includes("-pooler")
)
  throw new Error(
    "Reset integration tests require the isolated direct test branch.",
  );
for (const file of [".env.local", ".env.demo.local"])
  if (existsSync(file) && parse(readFileSync(file)).DATABASE_URL) {
    const configured = new URL(
      parse(readFileSync(file)).DATABASE_URL,
    ).hostname.replace("-pooler", "");
    if (configured === parsed.hostname)
      throw new Error("Reset tests must differ from development and demo.");
  }

const client = postgres(url, {
  max: 2,
  prepare: false,
  connect_timeout: 10,
  onnotice: () => {},
});
const db = drizzle(client, { schema });
const seed = createDemoSeed();

beforeAll(async () => {
  await db.execute(
    sql`insert into enquiry_ai_controls (id, enabled) values ('enquiry-ai', false) on conflict (id) do nothing`,
  );
  await db.insert(schema.roomTypes).values(seed.rooms).onConflictDoNothing();
  await db.insert(schema.ratePlans).values(seed.plan).onConflictDoNothing();
});
afterAll(async () => client.end());

describe("operator demo reset", () => {
  it("preserves staff and AI accounting, resets synthetic rows, and is repeatable", async () => {
    const beforeStaff = await db.execute(
      sql`select count(*)::int as count from app_user`,
    );
    const beforeUsage = await db.execute(
      sql`select count(*)::int as count, coalesce(sum(reserved_micro),0)::bigint as reserved, coalesce(sum(coalesce(charged_micro,0)),0)::bigint as charged from enquiry_ai_usage`,
    );
    const enquiryId = crypto.randomUUID();
    await db.execute(
      sql`insert into enquiries (id, submission_id, request_fingerprint, contact_name, contact_email, message) values (${enquiryId}, ${crypto.randomUUID()}, ${"a".repeat(64)}, 'Reset test', 'reset@example.test', 'Synthetic reset fixture')`,
    );
    const result = await resetDemoDatabase(client);
    expect(result.deleted).toBe(true);
    expect(
      (
        await db.execute(
          sql`select count(*)::int as count from enquiries where id=${enquiryId}`,
        )
      )[0].count,
    ).toBe(0);
    expect(
      (await db.execute(sql`select count(*)::int as count from app_user`))[0]
        .count,
    ).toBe(beforeStaff[0].count);
    expect(
      (
        await db.execute(
          sql`select count(*)::int as count, coalesce(sum(reserved_micro),0)::bigint as reserved, coalesce(sum(coalesce(charged_micro,0)),0)::bigint as charged from enquiry_ai_usage`,
        )
      )[0],
    ).toEqual(beforeUsage[0]);
    const repeated = await resetDemoDatabase(client);
    expect(repeated.deleted).toBe(true);
    expect(
      (
        await db.execute(
          sql`select count(*)::int as count from nightly_inventory`,
        )
      )[0].count,
    ).toBe(seed.inventory.length);
  });

  it("rolls back without partial deletion when configuration validation fails", async () => {
    const fixtureId = crypto.randomUUID();
    await db.execute(
      sql`insert into enquiries (id, submission_id, request_fingerprint, contact_name, contact_email, message) values (${fixtureId}, ${crypto.randomUUID()}, ${"b".repeat(64)}, 'Rollback test', 'rollback@example.test', 'Synthetic rollback fixture')`,
    );
    try {
      await db
        .update(schema.roomTypes)
        .set({ physicalUnits: seed.rooms[0].physicalUnits + 1 })
        .where(eq(schema.roomTypes.id, seed.rooms[0].id));
      await expect(resetDemoDatabase(client)).rejects.toThrow(
        /configuration differs/,
      );
      expect(
        (
          await db.execute(
            sql`select count(*)::int as count from enquiries where id=${fixtureId}`,
          )
        )[0].count,
      ).toBe(1);
    } finally {
      await db
        .update(schema.roomTypes)
        .set({ physicalUnits: seed.rooms[0].physicalUnits })
        .where(eq(schema.roomTypes.id, seed.rooms[0].id));
      await db.execute(sql`delete from enquiries where id=${fixtureId}`);
    }
  });

  it("refuses while analysis is processing and leaves the enquiry intact", async () => {
    const id = crypto.randomUUID();
    await db.execute(
      sql`insert into enquiries (id, submission_id, request_fingerprint, contact_name, contact_email, message, processing_state) values (${id}, ${crypto.randomUUID()}, ${"c".repeat(64)}, 'Active test', 'active@example.test', 'Synthetic active fixture', 'processing')`,
    );
    try {
      await expect(resetDemoDatabase(client)).rejects.toThrow(/being analysed/);
      expect(
        (
          await db.execute(
            sql`select processing_state from enquiries where id=${id}`,
          )
        )[0].processing_state,
      ).toBe("processing");
    } finally {
      await db.execute(sql`delete from enquiries where id=${id}`);
    }
  });

  it("rolls back rows deleted before a reseed failure", async () => {
    const before = await db.execute(
      sql`select (select count(*) from nightly_inventory)::int as inventory, (select count(*) from nightly_rates)::int as rates, (select count(*) from enquiries)::int as enquiries`,
    );
    await db.execute(
      sql`create or replace function reset_test_fail_rate() returns trigger language plpgsql as $$ begin raise exception 'reset test failure'; end $$`,
    );
    await db.execute(
      sql`create trigger reset_test_fail_rate_trigger before insert on nightly_rates for each row execute function reset_test_fail_rate()`,
    );
    try {
      await expect(resetDemoDatabase(client)).rejects.toThrow();
      const after = await db.execute(
        sql`select (select count(*) from nightly_inventory)::int as inventory, (select count(*) from nightly_rates)::int as rates, (select count(*) from enquiries)::int as enquiries`,
      );
      expect(after[0]).toEqual(before[0]);
    } finally {
      await db.execute(
        sql`drop trigger if exists reset_test_fail_rate_trigger on nightly_rates`,
      );
      await db.execute(sql`drop function if exists reset_test_fail_rate()`);
    }
  }, 15000);

  it("honours the lock timeout when another reset is in progress", async () => {
    let acquired!: () => void;
    const ready = new Promise<void>((resolve) => {
      acquired = resolve;
    });
    let release!: () => void;
    const held = new Promise<void>((resolve) => {
      release = resolve;
    });
    const blocker = db.transaction(async (tx) => {
      await tx.execute(sql`lock table bookings in access exclusive mode`);
      acquired();
      await held;
    });
    await ready;
    try {
      await expect(resetDemoDatabase(client)).rejects.toThrow();
    } finally {
      release();
      await blocker;
    }
  }, 15000);
});
