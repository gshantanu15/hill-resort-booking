import { test, expect } from "@playwright/test";
import { randomUUID } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { parse } from "dotenv";
import postgres from "postgres";
import { DEMO_STAFF_EMAIL, DEMO_STAFF_PASSWORD } from "../src/lib/demo-staff";

test.skip(
  !process.env.TEST_DATABASE_URL,
  "Requires an explicitly isolated database",
);

function database() {
  const url = process.env.TEST_DATABASE_URL!;
  const host = (value: string) =>
    new URL(value).hostname.replace("-pooler", "");
  expect(host(url)).toBe(
    "ep-silent-recipe-aoebqnm6.c-2.ap-southeast-1.aws.neon.tech",
  );
  expect(host(url)).toBe(host(process.env.DATABASE_URL!));
  for (const file of [".env.local", ".env.demo.local"])
    expect(host(url)).not.toBe(host(parse(readFileSync(file)).DATABASE_URL));
  return postgres(url, { prepare: false, connect_timeout: 10 });
}

test("staff sees all sources, filters details and recovers simulated intake without duplicates", async ({
  page,
  request,
  baseURL,
}, info) => {
  const db = database();
  const email = `${randomUUID()}@example.test`;
  const name = `Inbox ${randomUUID().slice(0, 8)}`;
  const content =
    "Original enquiry\nTwo nights for a family. <script>untrusted text</script>";
  try {
    expect((await request.get("/api/staff/enquiries")).status()).toBe(401);
    expect(
      (await request.post("/api/staff/enquiries", { data: {} })).status(),
    ).toBe(401);
    const website = await request.post("/api/enquiries", {
      data: {
        submissionId: randomUUID(),
        contact: { name: `${name} Website`, email },
        message: content,
      },
    });
    expect(website.status()).toBe(201);
    const reference = (await website.json()).reference;
    expect(
      (await request.get(`/api/staff/enquiries/${reference}`)).status(),
    ).toBe(401);
    await page.goto("/staff/enquiries");
    await expect(page).toHaveURL(/\/staff\/login/);
    await page.waitForLoadState("networkidle");
    await page.getByLabel("Email", { exact: true }).fill(DEMO_STAFF_EMAIL);
    await page.getByLabel("Password").fill(DEMO_STAFF_PASSWORD);
    await page.getByRole("button", { name: "Sign in", exact: true }).click();
    await expect(
      page.getByRole("heading", { name: "Rates & availability" }),
    ).toBeVisible();
    await page.waitForLoadState("networkidle");
    await page.getByRole("link", { name: "Enquiries", exact: true }).click();
    await expect(
      page.getByRole("heading", { name: "Enquiries" }),
    ).toBeVisible();
    expect(
      (
        await page.request.post("/api/staff/enquiries", {
          headers: { origin: "https://untrusted.example" },
          data: {},
        })
      ).status(),
    ).toBe(403);
    expect(
      (
        await page.request.post("/api/staff/enquiries", {
          headers: { origin: baseURL! },
          data: { source: "website" },
        })
      ).status(),
    ).toBe(400);
    const openIntake = async () => {
      await page
        .getByRole("button", { name: "Add enquiry", exact: true })
        .click();
      return page.getByRole("dialog", { name: "Add simulated enquiry" });
    };
    let form = await openIntake();
    await expect(form).toHaveClass(/enquiry-sim/);
    await form.getByLabel("Phone (optional)", { exact: true }).focus();
    await expect(
      form.getByLabel("Phone (optional)", { exact: true }),
    ).toBeFocused();
    await form
      .getByRole("button", { name: "Save simulated enquiry" })
      .press("Tab");
    await expect(
      form.getByRole("button", { name: "Close intake", exact: true }),
    ).toBeVisible();
    await form
      .getByRole("combobox", { name: "Intake source", exact: true })
      .selectOption("email");
    await form.getByLabel("Name", { exact: true }).fill(`${name} Email`);
    await form.getByLabel("Email", { exact: true }).fill(email);
    await form.getByLabel("Message", { exact: true }).fill(content);
    await page.route(
      "**/api/staff/enquiries",
      async (route) => {
        if (route.request().method() !== "POST") return route.continue();
        const response = await route.fetch();
        expect(response.status()).toBe(201);
        await route.abort("failed");
      },
      { times: 1 },
    );
    await form.getByRole("button", { name: "Save simulated enquiry" }).click();
    await expect(form.getByRole("button", { name: /retry/i })).toBeEnabled();
    await page.reload();
    await expect(form.getByLabel("Email", { exact: true })).toHaveValue(email);
    await form.getByRole("button", { name: /retry/i }).click();
    await expect(form.getByRole("status")).toContainText("Saved");
    await form
      .getByRole("button", { name: "Close intake", exact: true })
      .click();
    form = await openIntake();
    await form
      .getByRole("combobox", { name: "Intake source", exact: true })
      .selectOption("whatsapp");
    await form.getByLabel("Name", { exact: true }).fill(`${name} WhatsApp`);
    await form.getByLabel("Email", { exact: true }).fill(email);
    await form.getByLabel("Message", { exact: true }).fill(content);
    await form.getByRole("button", { name: "Save simulated enquiry" }).click();
    await expect(form.getByRole("status")).toContainText("Saved");
    await form
      .getByRole("button", { name: "Close intake", exact: true })
      .click();
    await page.reload();
    const filterSource = async (label: string) => {
      await page.getByRole("button", { name: /Source/ }).click();
      await page.getByRole("option", { name: label, exact: true }).click();
    };
    await filterSource("Website");
    await page
      .getByRole("button", { name: `Open enquiry from ${name} Website` })
      .click();
    const detail = page.locator(`[data-enquiry-id="${reference}"]`);
    await expect(detail).toHaveAttribute("aria-label", "Enquiry detail");
    await expect(detail).toContainText(content);
    await expect(detail).toContainText(email);
    await page.screenshot({
      path: info.outputPath("staff-detail.png"),
      fullPage: true,
    });
    writeFileSync(info.outputPath("staff-detail.html"), await page.content());
    await detail.getByRole("tab", { name: /Assistant/ }).click();
    await expect(detail).toContainText("No reply has been sent");
    await expect(
      detail.getByRole("button", { name: "Analyse enquiry" }),
    ).toBeDisabled();
    await page
      .context()
      .grantPermissions(["clipboard-read", "clipboard-write"], {
        origin: baseURL!,
      });
    await detail
      .getByRole("button", { name: "Copy enquiry reference" })
      .click();
    await expect(
      detail.getByRole("button", { name: "Copy enquiry reference" }),
    ).toContainText("Copied");
    await page.evaluate(() => {
      Object.defineProperty(navigator, "clipboard", {
        configurable: true,
        value: {
          writeText: async () => {
            throw new Error("denied");
          },
        },
      });
    });
    await detail
      .getByRole("button", { name: /Copy enquiry reference|Copied/ })
      .click();
    await expect(
      detail.getByRole("textbox", { name: "Enquiry reference", exact: true }),
    ).toHaveValue(reference);
    const response = await page.request.get(
      `/api/staff/enquiries/${reference}`,
    );
    expect(response.headers()["cache-control"]).toContain("no-store");
    const body = (await response.json()).enquiry;
    expect(body).not.toHaveProperty("requestFingerprint");
    expect(body).not.toHaveProperty("submissionId");
    for (const source of ["email", "whatsapp"]) {
      await filterSource(source === "email" ? "Email" : "WhatsApp");
      await expect(detail).toBeHidden();
      await expect(
        page.getByRole("button", {
          name: `Open enquiry from ${name} ${source === "email" ? "Email" : "WhatsApp"}`,
        }),
      ).toBeVisible();
    }
    const rows =
      await db`select source from enquiries where contact_email=${email}`;
    expect(rows.map((row) => row.source).sort()).toEqual([
      "email",
      "website",
      "whatsapp",
    ]);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await page.screenshot({
      path: info.outputPath("staff-inbox.png"),
      fullPage: true,
    });
    writeFileSync(info.outputPath("staff-inbox.html"), await page.content());
    await page.getByRole("button", { name: "Sign out", exact: true }).click();
    await expect(page).toHaveURL(/\/staff\/login/);
    expect(
      (await page.request.get(`/api/staff/enquiries/${reference}`)).status(),
    ).toBe(401);
  } finally {
    await db`delete from enquiries where contact_email=${email}`;
    await db.end();
  }
});

test("authenticated nonstaff cannot read or create staff enquiries", async ({
  request,
  baseURL,
}) => {
  const db = database();
  const id = randomUUID(),
    email = `${id}@example.test`;
  try {
    await db`insert into app_user(id,name,email,role) values(${id},'Synthetic nonstaff',${email},'guest')`;
    const copied =
      await db`insert into app_account(id,account_id,provider_id,user_id,password,created_at,updated_at)
      select ${randomUUID()},${id},'credential',${id},a.password,now(),now() from app_account a join app_user u on a.user_id=u.id where u.email=${DEMO_STAFF_EMAIL} and a.provider_id='credential' returning id`;
    expect(copied).toHaveLength(1);
    expect(
      (
        await request.post("/api/auth/sign-in/email", {
          headers: { origin: baseURL! },
          data: { email, password: DEMO_STAFF_PASSWORD },
        })
      ).ok(),
    ).toBe(true);
    expect((await request.get("/api/staff/enquiries")).status()).toBe(403);
    expect(
      (await request.get(`/api/staff/enquiries/${randomUUID()}`)).status(),
    ).toBe(403);
    expect(
      (
        await request.post("/api/staff/enquiries", {
          headers: { origin: baseURL! },
          data: {},
        })
      ).status(),
    ).toBe(403);
  } finally {
    await db`delete from app_user where id=${id}`;
    await db.end();
  }
});
