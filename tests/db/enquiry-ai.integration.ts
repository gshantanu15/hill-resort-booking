import { randomUUID } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import postgres from "postgres";
import { parse } from "dotenv";
import { and, eq, inArray, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import {
  afterAll,
  beforeAll,
  beforeEach,
  afterEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";
vi.mock("server-only", () => ({}));
import * as schema from "../../src/db/schema";
import {
  saveWebsiteEnquiry,
  updateStaffEnquiry,
} from "../../src/lib/enquiries";
import { analyseEnquiry } from "../../src/lib/enquiry-analysis";
import { insertEnquiryRoomQuote } from "../../src/lib/enquiry-quote";
import { OpenRouterError } from "../../src/lib/openrouter";

const url = process.env.TEST_DATABASE_URL;
if (!url) throw new Error("Set TEST_DATABASE_URL via .env.ai-test.local.");
const parsed = new URL(url);
const allowedHost = "ep-small-bar-aopct83h.c-2.ap-southeast-1.aws.neon.tech";
if (parsed.hostname !== allowedHost || parsed.hostname.includes("-pooler"))
  throw new Error(
    "This suite requires the isolated AI test branch and a direct connection.",
  );
for (const file of [".env.local", ".env.demo.local"])
  if (
    existsSync(file) &&
    new URL(parse(readFileSync(file)).DATABASE_URL).hostname.replace(
      "-pooler",
      "",
    ) === parsed.hostname
  )
    throw new Error("AI test database must differ from development and demo.");
const client = postgres(url, {
  max: 8,
  prepare: false,
  connect_timeout: 10,
  onnotice: () => {},
});
const db = drizzle(client, { schema });
const secret = "ai-enquiry-integration-secret-32-bytes";
const output = (
  category: "room" | "wedding" | "offsite" | "complaint" | "unsorted" = "room",
) => ({
  category,
  dates: { checkIn: null, checkOut: null, raw: null, yearMissing: false },
  guests: { adults: null, children: null, min: null, max: null },
  budget: { min: null, max: null, currency: null, raw: null },
  uncertainties: [],
  draft: "Please confirm the dates and guest details.",
});
function input(message = "Please share availability.") {
  return {
    submissionId: randomUUID(),
    contact: { name: "AI Synthetic", email: `${randomUUID()}@example.test` },
    message,
  };
}
async function cleanup(ids: string[]) {
  if (ids.length)
    await db.delete(schema.enquiries).where(inArray(schema.enquiries.id, ids));
}
async function control(
  values: Partial<typeof schema.aiControls.$inferInsert> = {},
) {
  await db
    .update(schema.aiControls)
    .set({
      enabled: true,
      dailyRequestLimit: 100,
      dailyBudgetMicro: 1_000_000,
      lifetimeBudgetMicro: 5_000_000,
      ...values,
    })
    .where(eq(schema.aiControls.id, "enquiry-ai"));
}
beforeAll(() => migrate(db, { migrationsFolder: "./drizzle" }));
beforeEach(async () => {
  vi.stubEnv("AI_INFERENCE_ENABLED", "true");
  vi.stubEnv("OPENROUTER_API_KEY", "test-key");
  await control();
});
afterEach(async () => {
  await control({
    enabled: false,
    dailyRequestLimit: 100,
    dailyBudgetMicro: 1_000_000,
    lifetimeBudgetMicro: 5_000_000,
  });
});
afterAll(async () => {
  await control({ enabled: false });
  vi.unstubAllEnvs();
  await client.end();
});

describe("enquiry AI persistence and quote boundaries", () => {
  it("persists successful analysis, routing defaults and a sales placeholder", async () => {
    const value = input();
    const saved = await saveWebsiteEnquiry(db, value);
    const fake = vi.fn(async () => ({
      data: output("wedding"),
      model: "anthropic/claude-haiku-5.5",
      provider: "test",
      costUsd: 0.001,
    }));
    try {
      const result = await analyseEnquiry(db, saved.reference, {}, fake);
      expect(result).toMatchObject({
        category: "wedding",
        owner: "sales",
        processingState: "processed",
        analysisModel: "anthropic/claude-haiku-5.5",
      });
      expect(result.draft).toContain("[Sales-approved quote]");
      expect(fake).toHaveBeenCalledTimes(1);
    } finally {
      await cleanup([saved.reference]);
    }
  });
  it("accepts year-missing dates anchored to the current reference year", async () => {
    const value = input("Please hold 10 to 12 December for our group.");
    const saved = await saveWebsiteEnquiry(db, value);
    const year = new Intl.DateTimeFormat("en-IN", {
      timeZone: "Asia/Kolkata",
      year: "numeric",
    }).format(new Date());
    const fake = vi.fn(async () => ({
      data: {
        ...output("room"),
        dates: {
          checkIn: `${year}-12-10`,
          checkOut: `${year}-12-12`,
          raw: "10 to 12 December",
          yearMissing: true,
        },
      },
      model: "anthropic/claude-haiku-5.5",
      provider: "test",
      costUsd: 0.001,
    }));
    try {
      const result = await analyseEnquiry(db, saved.reference, {}, fake);
      expect(result.processingState).toBe("processed");
      expect(result.extracted?.dates.yearMissing).toBe(true);
    } finally {
      await cleanup([saved.reference]);
    }
  });
  it("adds one Sales placeholder before an email sign-off", async () => {
    const saved = await saveWebsiteEnquiry(db, input());
    const fake = vi.fn(async () => ({
      data: {
        ...output("wedding"),
        draft: "Thank you for your enquiry.\n\nWarm regards,\nAavana Estate",
      },
      model: "anthropic/claude-haiku-5.5",
      provider: "test",
      costUsd: 0.001,
    }));
    try {
      const result = await analyseEnquiry(db, saved.reference, {}, fake);
      expect(result.draft.match(/\[Sales-approved quote\]/g)).toHaveLength(1);
      expect(result.draft.indexOf("[Sales-approved quote]")).toBeLessThan(
        result.draft.indexOf("Warm regards"),
      );
    } finally {
      await cleanup([saved.reference]);
    }
  });
  it("preserves manual routing and draft edits unless explicit replacement is requested", async () => {
    const value = input();
    const saved = await saveWebsiteEnquiry(db, value);
    const fake = vi.fn(async () => ({
      data: output("complaint"),
      model: "anthropic/claude-haiku-5.5",
      provider: "test",
      costUsd: 0.001,
    }));
    try {
      await updateStaffEnquiry(db, saved.reference, {
        action: "route",
        category: "room",
        owner: "reservations",
        expected: { category: "unsorted", owner: null },
      });
      await updateStaffEnquiry(db, saved.reference, {
        action: "draft",
        draft: "Manual draft",
        expectedDraft: "",
      });
      const kept = await analyseEnquiry(db, saved.reference, {}, fake);
      expect(kept).toMatchObject({
        category: "room",
        owner: "reservations",
        draft: "Manual draft",
      });
      const replaced = await analyseEnquiry(
        db,
        saved.reference,
        { replaceRouting: true, replaceDraft: true },
        fake,
      );
      expect(replaced).toMatchObject({
        category: "complaint",
        owner: "gm",
        gmAttention: true,
      });
    } finally {
      await cleanup([saved.reference]);
    }
  });
  it("does not call the model when disabled or over quota", async () => {
    const value = input();
    const saved = await saveWebsiteEnquiry(db, value);
    const fake = vi.fn(async () => ({
      data: output(),
      model: "anthropic/claude-haiku-5.5",
      provider: "test",
      costUsd: 0.001,
    }));
    try {
      await control({ enabled: false });
      await expect(
        analyseEnquiry(db, saved.reference, {}, fake),
      ).rejects.toMatchObject({ status: 503 });
      expect(fake).not.toHaveBeenCalled();
      await control({ enabled: true, dailyRequestLimit: 0 });
      await expect(
        analyseEnquiry(db, saved.reference, {}, fake),
      ).rejects.toMatchObject({ status: 503 });
      expect(fake).not.toHaveBeenCalled();
    } finally {
      await cleanup([saved.reference]);
    }
  });
  it("records provider failures and leaves the saved draft intact", async () => {
    const value = input();
    const saved = await saveWebsiteEnquiry(db, value);
    await updateStaffEnquiry(db, saved.reference, {
      action: "draft",
      draft: "Keep this draft",
      expectedDraft: "",
    });
    const fake = vi.fn(async () => {
      throw new OpenRouterError("timeout");
    });
    try {
      await expect(
        analyseEnquiry(db, saved.reference, {}, fake),
      ).rejects.toMatchObject({ status: 503 });
      const [row] = await db
        .select()
        .from(schema.enquiries)
        .where(eq(schema.enquiries.id, saved.reference));
      expect(row).toMatchObject({
        draft: "Keep this draft",
        processingState: "failed",
        analysisFailure: "timeout",
      });
    } finally {
      await cleanup([saved.reference]);
    }
  });
  it("deduplicates concurrent analysis and preserves edits made while inference waits", async () => {
    const saved = await saveWebsiteEnquiry(db, input());
    let release!: () => void;
    const pending = new Promise<void>((resolve) => {
      release = resolve;
    });
    let entered!: () => void;
    const providerEntered = new Promise<void>((resolve) => {
      entered = resolve;
    });
    const fake = vi.fn(async () => {
      entered();
      await pending;
      return {
        data: output("complaint"),
        model: "anthropic/claude-haiku-5.5",
        provider: "test",
        costUsd: 0.001,
      };
    });
    try {
      const first = analyseEnquiry(
        db,
        saved.reference,
        { replaceRouting: true, replaceDraft: true },
        fake,
      );
      await providerEntered;
      await updateStaffEnquiry(db, saved.reference, {
        action: "route",
        category: "room",
        owner: "reservations",
        expected: { category: "unsorted", owner: null },
      });
      await updateStaffEnquiry(db, saved.reference, {
        action: "draft",
        draft: "Edited while waiting",
        expectedDraft: "",
      });
      await expect(
        analyseEnquiry(db, saved.reference, {}, fake),
      ).rejects.toMatchObject({ status: 409 });
      release();
      const result = await first;
      expect(result).toMatchObject({
        category: "room",
        owner: "reservations",
        draft: "Edited while waiting",
      });
      expect(fake).toHaveBeenCalledTimes(1);
    } finally {
      await cleanup([saved.reference]);
    }
  });
  it("aborts when AI is disabled during inference and recovers a stale lease", async () => {
    const saved = await saveWebsiteEnquiry(db, input());
    let signal!: AbortSignal;
    let entered!: () => void;
    const providerEntered = new Promise<void>((resolve) => {
      entered = resolve;
    });
    const fake = vi.fn(async (request: { signal?: AbortSignal }) => {
      signal = request.signal!;
      entered();
      await new Promise((resolve) =>
        request.signal?.addEventListener("abort", resolve, { once: true }),
      );
      throw new OpenRouterError("disabled");
    });
    try {
      const running = analyseEnquiry(db, saved.reference, {}, fake);
      await providerEntered;
      await control({ enabled: false });
      await expect(running).rejects.toMatchObject({ status: 503 });
      expect(signal.aborted).toBe(true);
      await db
        .update(schema.enquiries)
        .set({
          processingState: "processing",
          analysisStartedAt: sql`clock_timestamp() - interval '3 minutes'`,
          analysisToken: null,
        })
        .where(eq(schema.enquiries.id, saved.reference));
      await control();
      const recovered = await analyseEnquiry(
        db,
        saved.reference,
        {},
        async () => ({
          data: output("room"),
          model: "anthropic/claude-haiku-5.5",
          provider: "test",
          costUsd: 0.001,
        }),
      );
      expect(recovered.processingState).toBe("processed");
    } finally {
      await cleanup([saved.reference]);
    }
  });
  it("inserts an authoritative room quote without creating bookings or inventory writes", async () => {
    const value = input();
    const saved = await saveWebsiteEnquiry(db, value);
    await updateStaffEnquiry(db, saved.reference, {
      action: "draft",
      draft:
        "Hello,\n\nPlease review this stay.\n\n[Reservations: insert checked accommodation total here]\n\nWarm regards,\nAavana Estate",
      expectedDraft: "",
    });
    const before = await db
      .select({ booked: schema.nightlyInventory.booked })
      .from(schema.nightlyInventory)
      .where(
        and(
          eq(schema.nightlyInventory.roomTypeId, "garden-room"),
          sql`${schema.nightlyInventory.stayDate} >= '2026-11-20' AND ${schema.nightlyInventory.stayDate} < '2026-11-22'`,
        ),
      );
    try {
      const result = await insertEnquiryRoomQuote(
        db,
        saved.reference,
        {
          expectedDraft:
            "Hello,\n\nPlease review this stay.\n\n[Reservations: insert checked accommodation total here]\n\nWarm regards,\nAavana Estate",
          selection: {
            checkIn: "2026-11-20",
            checkOut: "2026-11-22",
            adults: 2,
            children: 0,
            items: [
              {
                roomTypeId: "garden-room",
                quantity: 1,
                adults: 2,
                children: 0,
              },
            ],
          },
        },
        { secret },
      );
      expect(result.draft).toContain("[Accommodation quote]");
      expect(result.draft).not.toContain(
        "[Reservations: insert checked accommodation total here]",
      );
      expect(result.draft).toContain("Please review this stay.");
      expect(result.draft).toContain("Warm regards");
      expect(result.draft.indexOf("[Accommodation quote]")).toBeLessThan(
        result.draft.indexOf("Warm regards"),
      );
      const after = await db
        .select({ booked: schema.nightlyInventory.booked })
        .from(schema.nightlyInventory)
        .where(
          and(
            eq(schema.nightlyInventory.roomTypeId, "garden-room"),
            sql`${schema.nightlyInventory.stayDate} >= '2026-11-20' AND ${schema.nightlyInventory.stayDate} < '2026-11-22'`,
          ),
        );
      expect(after).toEqual(before);
      await expect(
        insertEnquiryRoomQuote(
          db,
          saved.reference,
          {
            expectedDraft:
              "Hello,\n\nPlease review this stay.\n\n[Reservations: insert checked accommodation total here]\n\nWarm regards,\nAavana Estate",
            selection: {
              checkIn: "2026-11-20",
              checkOut: "2026-11-22",
              adults: 2,
              children: 0,
              items: [
                {
                  roomTypeId: "garden-room",
                  quantity: 1,
                  adults: 2,
                  children: 0,
                },
              ],
            },
          },
          { secret },
        ),
      ).resolves.toMatchObject({ draft: result.draft });
    } finally {
      await cleanup([saved.reference]);
    }
  });
});
