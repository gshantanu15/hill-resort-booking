import { test, expect } from "@playwright/test";
import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { parse } from "dotenv";
import postgres from "postgres";

test("enquiry persists once after an interrupted response and refresh", async ({
  page,
}, info) => {
  test.skip(
    !process.env.TEST_DATABASE_URL,
    "Requires an explicitly isolated test database",
  );
  const url = process.env.TEST_DATABASE_URL!;
  const host = (value: string) =>
    new URL(value).hostname.replace("-pooler", "");
  for (const file of [".env.local", ".env.demo.local"])
    expect(host(url)).not.toBe(host(parse(readFileSync(file)).DATABASE_URL));
  expect(host(url)).toBe(host(process.env.DATABASE_URL!));
  const email = `${randomUUID()}@example.test`;
  const db = postgres(url, { prepare: false });
  try {
    await page.goto("/enquire");
    await page
      .getByRole("button", { name: "Send enquiry", exact: true })
      .click();
    await expect(page.locator("[aria-invalid=true]")).toHaveCount(3);
    await page.getByLabel("Full name", { exact: true }).fill("Synthetic Guest");
    await page.getByLabel("Email", { exact: true }).fill(email);
    await page
      .getByLabel("What can we help with?")
      .fill("Please share availability for our stay.");
    await page.route(
      "**/api/enquiries",
      async (route) => {
        const response = await route.fetch();
        expect(response.status()).toBe(201);
        await route.abort("failed");
      },
      { times: 1 },
    );
    await page
      .getByRole("button", { name: "Send enquiry", exact: true })
      .click();
    await expect(page.getByRole("button", { name: "Try again" })).toBeEnabled();
    await page.reload();
    await expect(page.getByLabel("Email", { exact: true })).toHaveValue(email);
    await expect(page.getByLabel("Email", { exact: true })).toHaveAttribute(
      "readonly",
      "",
    );
    await page.getByRole("button", { name: "Try again" }).click();
    await expect(page.getByRole("status")).toContainText(
      "Your enquiry has reached our team",
    );
    const rows = await db`select * from enquiries where contact_email=${email}`;
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      source: "website",
      processing_state: "unprocessed",
      category: "unsorted",
      needs_review: true,
    });
    await page.reload();
    await expect(page.getByRole("status")).toContainText(rows[0].id);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await page.screenshot({
      path: info.outputPath("enquiry-saved.png"),
      fullPage: true,
    });
  } finally {
    await db`delete from enquiries where contact_email=${email}`;
    await db.end();
  }
});

test("enquiry API rejects invalid requests and offers no public retrieval", async ({
  request,
}) => {
  expect((await request.get("/api/enquiries")).status()).toBe(405);
  expect(
    (
      await request.post("/api/enquiries", {
        data: {},
        headers: { origin: "https://untrusted.example" },
      })
    ).status(),
  ).toBe(403);
  expect((await request.post("/api/enquiries", { data: {} })).status()).toBe(
    400,
  );
  expect(
    (
      await request.post("/api/enquiries", {
        data: { padding: "a".repeat(17000) },
      })
    ).status(),
  ).toBe(413);
});
