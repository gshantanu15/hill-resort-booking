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
import {
  getStaffEnquiry,
  listStaffEnquiries,
  saveSimulatedEnquiry,
} from "../../src/lib/enquiries";

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

function input(
  source: "email" | "whatsapp" = "email",
  email = `${randomUUID()}@example.test`,
) {
  return {
    submissionId: randomUUID(),
    source,
    contact: { name: "Synthetic Staff Test", email },
    message: `${source} message ${randomUUID()}`,
  };
}

async function cleanup(ids: string[]) {
  if (ids.length)
    await db
      .delete(schema.enquiries)
      .where(inArray(schema.enquiries.submissionId, ids));
}

describe("staff enquiry persistence and projections", () => {
  it("persists a simulated source and exact retry while rejecting changed source", async () => {
    const value = input();
    try {
      const first = await saveSimulatedEnquiry(db, value);
      const retry = await saveSimulatedEnquiry(db, value);
      expect(retry).toMatchObject({
        reference: first.reference,
        duplicate: true,
      });
      await expect(
        saveSimulatedEnquiry(db, { ...value, source: "whatsapp" }),
      ).rejects.toMatchObject({ code: "SUBMISSION_CONFLICT", status: 409 });
      const [row] = await db
        .select()
        .from(schema.enquiries)
        .where(eq(schema.enquiries.submissionId, value.submissionId));
      expect(row).toMatchObject({
        source: "email",
        category: "unsorted",
        needsReview: true,
        gmAttention: true,
      });
    } finally {
      await cleanup([value.submissionId]);
    }
  });

  it("lists mixed sources with source/category/owner/review filters and paginates", async () => {
    const values = [input("email"), input("whatsapp"), input("email")];
    try {
      const saved = await Promise.all(
        values.map((value) => saveSimulatedEnquiry(db, value)),
      );
      await db
        .update(schema.enquiries)
        .set({ category: "complaint", owner: "gm", needsReview: true })
        .where(eq(schema.enquiries.id, saved[1].reference));
      await db
        .update(schema.enquiries)
        .set({
          category: "room",
          owner: "reservations",
          needsReview: false,
          gmAttention: false,
        })
        .where(eq(schema.enquiries.id, saved[2].reference));
      const filtered = await listStaffEnquiries(db, {
        source: "whatsapp",
        category: "complaint",
        owner: "gm",
        attention: "gm",
        review: "needs-review",
      });
      expect(filtered.total).toBe(1);
      expect(filtered.rows[0]).toMatchObject({
        source: "whatsapp",
        category: "complaint",
        owner: "gm",
        gmAttention: true,
        needsReview: true,
      });
      expect(filtered.rows[0]).not.toHaveProperty("contactEmail");
      const page = await listStaffEnquiries(db, { page: "2" });
      expect(page.page).toBe(2);
      expect(page.pageSize).toBe(25);
    } finally {
      await cleanup(values.map((value) => value.submissionId));
    }
  });

  it("keeps owned pagination pages disjoint and supports combined and unassigned filters", async () => {
    const values = Array.from({ length: 26 }, () => input("email"));
    const unassigned = input("whatsapp");
    try {
      const saved = [];
      for (const value of values)
        saved.push(await saveSimulatedEnquiry(db, value));
      const unassignedSaved = await saveSimulatedEnquiry(db, unassigned);
      await db
        .update(schema.enquiries)
        .set({ category: "offsite", owner: "sales", needsReview: true })
        .where(
          inArray(
            schema.enquiries.id,
            saved.map((row) => row.reference),
          ),
        );
      await db
        .update(schema.enquiries)
        .set({ category: "offsite", owner: null, needsReview: true })
        .where(eq(schema.enquiries.id, unassignedSaved.reference));

      const filters = {
        source: "email" as const,
        category: "offsite" as const,
        owner: "sales" as const,
        review: "needs-review" as const,
      };
      const pageOne = await listStaffEnquiries(db, { ...filters, page: "1" });
      const pageTwo = await listStaffEnquiries(db, { ...filters, page: "2" });
      expect(pageOne.total).toBeGreaterThanOrEqual(26);
      expect(pageOne.rows).toHaveLength(25);
      expect(pageTwo.rows.length).toBeGreaterThanOrEqual(1);
      expect(new Set(pageOne.rows.map((row) => row.id)).size).toBe(25);
      expect(
        pageOne.rows
          .map((row) => row.id)
          .filter((id) => pageTwo.rows.some((row) => row.id === id)),
      ).toHaveLength(0);
      expect(
        pageTwo.rows.every(
          (row) =>
            row.source === "email" &&
            row.category === "offsite" &&
            row.owner === "sales",
        ),
      ).toBe(true);

      const unassignedRows = await listStaffEnquiries(db, {
        source: "whatsapp",
        category: "offsite",
        owner: "unassigned",
        review: "needs-review",
      });
      expect(unassignedRows.total).toBeGreaterThanOrEqual(1);
      expect(
        unassignedRows.rows.some((row) => row.id === unassignedSaved.reference),
      ).toBe(true);
    } finally {
      await cleanup([...values, unassigned].map((value) => value.submissionId));
    }
  });

  it("returns a staff detail projection without submission fingerprint fields", async () => {
    const value = input("whatsapp");
    try {
      const saved = await saveSimulatedEnquiry(db, value);
      const detail = await getStaffEnquiry(db, saved.reference);
      expect(detail).toMatchObject({
        contact: { name: value.contact.name, email: value.contact.email },
        source: "whatsapp",
        extracted: null,
      });
      expect(detail).not.toHaveProperty("submissionId");
      expect(detail).not.toHaveProperty("requestFingerprint");
      await expect(getStaffEnquiry(db, "not-a-uuid")).rejects.toMatchObject({
        status: 400,
      });
      await expect(getStaffEnquiry(db, randomUUID())).rejects.toMatchObject({
        status: 404,
      });
    } finally {
      await cleanup([value.submissionId]);
    }
  });
});
