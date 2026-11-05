import { randomUUID } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import postgres from "postgres";
import { parse } from "dotenv";
import { eq, inArray } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
import * as schema from "../../src/db/schema";
import { saveWebsiteEnquiry } from "../../src/lib/enquiries";

// This suite is intentionally isolated: it writes rows and must never use the app/demo database.
const url = process.env.TEST_DATABASE_URL;
if (!url)
  throw new Error("Set TEST_DATABASE_URL to an isolated test database.");
const parsedUrl = new URL(url);
if (parsedUrl.hostname.includes("-pooler"))
  throw new Error("TEST_DATABASE_URL must use a direct connection.");
const allowedHost =
  "ep-silent-recipe-aoebqnm6.c-2.ap-southeast-1.aws.neon.tech";
if (parsedUrl.hostname !== allowedHost)
  throw new Error(
    `This suite requires the isolated enquiry test branch (${allowedHost}).`,
  );
for (const file of [".env.local", ".env.demo.local"]) {
  if (!existsSync(file)) continue;
  const configured = parse(readFileSync(file));
  if (
    configured.DATABASE_URL &&
    new URL(configured.DATABASE_URL).hostname.replace("-pooler", "") ===
      parsedUrl.hostname
  )
    throw new Error(
      "TEST_DATABASE_URL must differ from development and shared demo databases.",
    );
}
const client = postgres(url, {
  max: 8,
  prepare: false,
  connect_timeout: 10,
  onnotice: () => {},
});
const db = drizzle(client, { schema });

beforeAll(() => migrate(db, { migrationsFolder: "./drizzle" }));
afterAll(() => client.end());

function input(email = `${randomUUID()}@example.test`) {
  return {
    submissionId: randomUUID(),
    contact: { name: "Synthetic Enquiry", email },
    message: "Please share room availability for a short stay.",
  };
}

async function cleanup(submissionIds: string[]) {
  if (submissionIds.length)
    await db
      .delete(schema.enquiries)
      .where(inArray(schema.enquiries.submissionId, submissionIds));
}

describe("website enquiry persistence", () => {
  it("persists website defaults and returns the same reference on exact retry", async () => {
    const first = input();
    try {
      const saved = await saveWebsiteEnquiry(db, first);
      const retry = await saveWebsiteEnquiry(db, first);
      expect(saved.duplicate).toBe(false);
      expect(retry).toEqual({ reference: saved.reference, duplicate: true });
      const [row] = await db
        .select()
        .from(schema.enquiries)
        .where(eq(schema.enquiries.submissionId, first.submissionId));
      expect(row).toMatchObject({
        source: "website",
        category: "unsorted",
        needsReview: true,
        gmAttention: true,
        processingState: "unprocessed",
        draft: "",
      });
      expect(row.contactEmail).toBe(first.contact.email);
    } finally {
      await cleanup([first.submissionId]);
    }
  });

  it("allows concurrent identical retries to create one row", async () => {
    const value = input();
    try {
      const results = await Promise.all([
        saveWebsiteEnquiry(db, value),
        saveWebsiteEnquiry(db, value),
        saveWebsiteEnquiry(db, value),
      ]);
      expect(new Set(results.map((result) => result.reference)).size).toBe(1);
      expect(results.filter((result) => !result.duplicate)).toHaveLength(1);
      const rows = await db
        .select({ id: schema.enquiries.id })
        .from(schema.enquiries)
        .where(eq(schema.enquiries.submissionId, value.submissionId));
      expect(rows).toHaveLength(1);
    } finally {
      await cleanup([value.submissionId]);
    }
  });

  it("rejects reuse of a submission id with changed content", async () => {
    const value = input();
    try {
      await saveWebsiteEnquiry(db, value);
      await expect(
        saveWebsiteEnquiry(db, { ...value, message: "Changed message" }),
      ).rejects.toMatchObject({ code: "SUBMISSION_CONFLICT", status: 409 });
    } finally {
      await cleanup([value.submissionId]);
    }
  });

  it("rejects malformed input without writing", async () => {
    const bad = {
      submissionId: randomUUID(),
      contact: { name: "", email: "bad" },
      message: "",
    };
    await expect(saveWebsiteEnquiry(db, bad)).rejects.toMatchObject({
      code: "INVALID_ENQUIRY",
    });
    const rows = await db
      .select({ id: schema.enquiries.id })
      .from(schema.enquiries)
      .where(eq(schema.enquiries.submissionId, bad.submissionId));
    expect(rows).toHaveLength(0);
  });

  it("enforces five submissions per email per hour while allowing exact retry", async () => {
    const email = `${randomUUID()}@example.test`;
    const values = Array.from({ length: 5 }, () => input(email));
    try {
      for (const value of values) await saveWebsiteEnquiry(db, value);
      await expect(saveWebsiteEnquiry(db, input(email))).rejects.toMatchObject({
        code: "ENQUIRY_LIMIT",
        status: 429,
      });
      await expect(saveWebsiteEnquiry(db, values[0])).resolves.toMatchObject({
        duplicate: true,
      });
    } finally {
      await cleanup(values.map((value) => value.submissionId));
    }
  });

  it("serializes a competing sixth submission for the same email", async () => {
    const email = `${randomUUID()}@example.test`;
    const values = Array.from({ length: 5 }, () => input(email));
    const sixth = [input(email), input(email)];
    try {
      for (const value of values) await saveWebsiteEnquiry(db, value);
      const results = await Promise.allSettled(
        sixth.map((value) => saveWebsiteEnquiry(db, value)),
      );
      expect(
        results.filter((result) => result.status === "fulfilled"),
      ).toHaveLength(0);
      expect(
        results.filter(
          (result) =>
            result.status === "rejected" &&
            (result.reason as { code?: string }).code === "ENQUIRY_LIMIT",
        ),
      ).toHaveLength(2);
    } finally {
      await cleanup([...values, ...sixth].map((value) => value.submissionId));
    }
  });

  it("enforces the global hourly intake limit and preserves exact retry", async () => {
    const values = Array.from({ length: 100 }, () => input());
    try {
      await saveWebsiteEnquiry(db, values[0]);
      await db.insert(schema.enquiries).values(
        values.slice(1).map((value) => ({
          submissionId: value.submissionId,
          requestFingerprint: "synthetic-limit-fixture",
          contactName: value.contact.name,
          contactEmail: value.contact.email,
          message: value.message,
        })),
      );
      const blocked = input();
      await expect(saveWebsiteEnquiry(db, blocked)).rejects.toMatchObject({
        code: "ENQUIRY_LIMIT",
        status: 429,
      });
      await expect(saveWebsiteEnquiry(db, values[0])).resolves.toMatchObject({
        duplicate: true,
      });
      await cleanup([blocked.submissionId]);
    } finally {
      await cleanup(values.map((value) => value.submissionId));
    }
  });
});
