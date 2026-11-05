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
    "ep-small-bar-aopct83h.c-2.ap-southeast-1.aws.neon.tech",
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
    const checkNavigation = async (current: string) => {
      const navigation = page.getByRole("navigation", {
        name: "Staff navigation",
      });
      for (const label of ["Guest site", "Enquiries", "Calendar"])
        await expect(
          navigation.getByRole("link", { name: label, exact: true }),
        ).toBeVisible();
      await expect(
        navigation.getByRole("button", { name: "Sign out", exact: true }),
      ).toBeVisible();
      await expect(
        navigation.getByRole("link", { name: current, exact: true }),
      ).toHaveAttribute("aria-current", "page");
      await expect(
        page.getByText("Staff workspace", { exact: true }),
      ).toBeVisible();
    };
    await checkNavigation("Calendar");
    await page.getByRole("link", { name: "Enquiries", exact: true }).click();
    await expect(
      page.getByRole("heading", { name: "Enquiries" }),
    ).toBeVisible();
    await checkNavigation("Enquiries");
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
    await expect(detail).toContainText("Unsent draft.");
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
    expect((await request.get("/api/staff/ai")).status()).toBe(403);
    expect(
      (
        await request.patch(`/api/staff/enquiries/${randomUUID()}`, {
          headers: { origin: baseURL! },
          data: {},
        })
      ).status(),
    ).toBe(403);
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
    expect(
      (
        await request.post(`/api/staff/enquiries/${randomUUID()}/analyse`, {
          headers: { origin: baseURL! },
          data: {},
        })
      ).status(),
    ).toBe(403);
    expect(
      (
        await request.post(`/api/staff/enquiries/${randomUUID()}/quote`, {
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

test("staff corrects routing and saves unsent drafts with safe conflict recovery", async ({
  page,
  request,
  baseURL,
}, info) => {
  const db = database();
  const email = randomUUID() + "@example.test";
  const name = "Routing " + randomUUID().slice(0, 8);
  try {
    const created = await request.post("/api/enquiries", {
      data: {
        submissionId: randomUUID(),
        contact: { name, email },
        message: "Please help arrange a family stay.",
      },
    });
    expect(created.status()).toBe(201);
    const id = (await created.json()).reference;
    const url = "/api/staff/enquiries/" + id;
    expect((await request.patch(url, { data: {} })).status()).toBe(401);
    expect(
      (
        await page.request.post("/api/auth/sign-in/email", {
          headers: { origin: baseURL! },
          data: { email: DEMO_STAFF_EMAIL, password: DEMO_STAFF_PASSWORD },
        })
      ).ok(),
    ).toBe(true);
    expect(
      (
        await page.request.patch(url, {
          headers: { origin: "https://untrusted.example" },
          data: {},
        })
      ).status(),
    ).toBe(403);
    expect(
      (
        await page.request.patch(url, {
          headers: { origin: baseURL! },
          data: { action: "send" },
        })
      ).status(),
    ).toBe(400);
    await page.goto("/staff/enquiries");
    await page
      .getByRole("button", { name: "Open enquiry from " + name, exact: true })
      .click();
    const routing = page.getByRole("region", { name: "Routing", exact: true });
    const choose = async (label: string, value: string) => {
      await routing.getByRole("button", { name: new RegExp(label) }).click();
      await page.getByRole("option", { name: value, exact: true }).click();
    };
    await choose("Category", "Room");
    await expect(routing.getByRole("button", { name: /Owner/ })).toContainText(
      "Reservations",
    );
    await routing
      .getByRole("button", { name: "Save routing", exact: true })
      .click();
    await expect(routing.getByRole("status")).toContainText("Routing saved");
    await choose("Category", "Complaint");
    await expect(routing.getByRole("button", { name: /Owner/ })).toContainText(
      "GM",
    );
    await choose("Owner", "Sales");
    await routing
      .getByRole("button", { name: "Save routing", exact: true })
      .click();
    await expect(routing.getByRole("status")).toContainText("Routing saved");
    await expect(page.locator(".ei-status-line")).toContainText("GM attention");
    await expect(page.locator(".ei-status-line")).toContainText("Sales");
    await page.getByRole("tab", { name: /Assistant/ }).click();
    const draft = page.getByRole("textbox", {
      name: "Draft reply",
      exact: true,
    });
    await draft.fill(
      "Thank you for telling us. Our team will review your concern.",
    );
    await page.getByRole("tab", { name: "Enquiry", exact: true }).click();
    await page.getByRole("tab", { name: /Assistant/ }).click();
    await expect(draft).toHaveValue(
      "Thank you for telling us. Our team will review your concern.",
    );
    page.once("dialog", (dialog) => dialog.dismiss());
    await page.getByRole("link", { name: "Calendar", exact: true }).click();
    await expect(draft).toHaveValue(
      "Thank you for telling us. Our team will review your concern.",
    );
    await page.route(
      "**/api/staff/enquiries/" + id,
      async (route) => {
        if (route.request().method() !== "PATCH") return route.continue();
        const response = await route.fetch();
        expect(response.status()).toBe(200);
        await route.abort("failed");
      },
      { times: 1 },
    );
    await page.getByRole("button", { name: "Save draft", exact: true }).click();
    await expect(
      page
        .getByRole("region", { name: "Draft reply", exact: true })
        .getByRole("status"),
    ).toContainText("could not be confirmed");
    await expect(draft).toHaveValue(
      "Thank you for telling us. Our team will review your concern.",
    );
    await page.getByRole("button", { name: "Save draft", exact: true }).click();
    await expect(
      page
        .getByRole("region", { name: "Draft reply", exact: true })
        .getByRole("status"),
    ).toContainText("Draft saved");
    const baseline = await draft.inputValue();
    expect(
      (
        await page.request.patch(url, {
          headers: { origin: baseURL! },
          data: {
            action: "draft",
            draft: "Saved by another staff session.",
            expectedDraft: baseline,
          },
        })
      ).status(),
    ).toBe(200);
    await draft.fill("My local edits must remain here.");
    await page.getByRole("button", { name: "Save draft", exact: true }).click();
    await expect(
      page
        .getByRole("region", { name: "Draft reply", exact: true })
        .getByRole("status"),
    ).toContainText("changed elsewhere");
    await expect(draft).toHaveValue("My local edits must remain here.");
    page.once("dialog", (dialog) => dialog.dismiss());
    await page
      .getByRole("button", { name: "Reload saved draft", exact: true })
      .click();
    await expect(draft).toHaveValue("My local edits must remain here.");
    page.once("dialog", (dialog) => dialog.accept());
    await page
      .getByRole("button", { name: "Reload saved draft", exact: true })
      .click();
    await expect(draft).toHaveValue("Saved by another staff session.");
    await draft.fill("Final unsent draft for the team to review.");
    await page.getByRole("button", { name: "Save draft", exact: true }).click();
    await expect(
      page
        .getByRole("region", { name: "Draft reply", exact: true })
        .getByRole("status"),
    ).toContainText("Draft saved");
    await page.reload();
    await page
      .getByRole("button", { name: "Open enquiry from " + name, exact: true })
      .click();
    await expect(page.locator(".ei-status-line")).toContainText("GM attention");
    await expect(
      routing.getByRole("button", { name: /Category/ }),
    ).toContainText("Complaint");
    await expect(routing.getByRole("button", { name: /Owner/ })).toContainText(
      "Sales",
    );
    await page.getByRole("tab", { name: /Assistant/ }).click();
    await expect(draft).toHaveValue(
      "Final unsent draft for the team to review.",
    );
    await expect(page.getByRole("button", { name: /send reply/i })).toHaveCount(
      0,
    );
    const saved = await page.request.get(url);
    expect(saved.headers()["cache-control"]).toBe("no-store");
    expect((await saved.json()).enquiry).toMatchObject({
      category: "complaint",
      owner: "sales",
      gmAttention: true,
      needsReview: true,
      draft: "Final unsent draft for the team to review.",
      message: "Please help arrange a family stay.",
    });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await page.screenshot({
      path: info.outputPath("manual-routing-draft.png"),
      fullPage: true,
    });
  } finally {
    await db`delete from enquiries where contact_email=${email}`;
    await db.end();
  }
});

test("staff reviews saved AI assistance, protects drafts and inserts an authoritative room quote", async ({
  page,
  request,
  baseURL,
}, info) => {
  const db = database();
  const email = randomUUID() + "@example.test";
  const name = "Assistance " + randomUUID().slice(0, 8);
  let analysisCalls = 0;
  const extracted = {
    category: "offsite",
    dates: {
      checkIn: null,
      checkOut: null,
      raw: "mid-December",
      yearMissing: true,
    },
    guests: { adults: null, children: null, min: 35, max: 45 },
    budget: { min: null, max: null, currency: null, raw: null },
    uncertainties: ["Confirm the year and exact dates."],
    draft: "Please confirm the year and event requirements.",
  };
  try {
    const created = await request.post("/api/enquiries", {
      data: {
        submissionId: randomUUID(),
        contact: { name, email },
        message: "Corporate offsite for 35-45 guests in mid-December.",
      },
    });
    expect(created.status()).toBe(201);
    const id = (await created.json()).reference;
    const endpoint = "/api/staff/enquiries/" + id;
    expect(
      (await request.post(endpoint + "/analyse", { data: {} })).status(),
    ).toBe(401);
    expect(
      (await request.post(endpoint + "/quote", { data: {} })).status(),
    ).toBe(401);
    expect((await request.get("/api/staff/ai")).status()).toBe(401);
    expect(
      (
        await page.request.post("/api/auth/sign-in/email", {
          headers: { origin: baseURL! },
          data: { email: DEMO_STAFF_EMAIL, password: DEMO_STAFF_PASSWORD },
        })
      ).ok(),
    ).toBe(true);
    expect(
      (
        await page.request.post(endpoint + "/analyse", {
          headers: { origin: "https://untrusted.example" },
          data: {},
        })
      ).status(),
    ).toBe(403);
    expect(
      (
        await page.request.post(endpoint + "/quote", {
          headers: { origin: "https://untrusted.example" },
          data: {},
        })
      ).status(),
    ).toBe(403);
    await page.route("**/api/staff/ai", (route) =>
      route.fulfill({
        json: {
          enabled: true,
          reason: null,
          requestsUsed: 0,
          dailyRequestLimit: 100,
          dailyReservedUsd: 0,
          dailyBudgetUsd: 1,
        },
      }),
    );
    await page.route(
      "**/api/staff/enquiries/" + id + "/analyse",
      async (route) => {
        analysisCalls++;
        const input = route.request().postDataJSON();
        const [existing] =
          await db`select draft,draft_edited from enquiries where id=${id}`;
        const draft =
          existing.draft_edited && !input.replaceDraft
            ? existing.draft
            : extracted.draft + "\n\n[Sales-approved quote]";
        await db`update enquiries set extracted=${db.json(extracted)},category='offsite',owner='sales',processing_state='processed',analysis_model='anthropic/claude-haiku-5.5',analysis_provider='synthetic-browser-test',analysed_at=now(),draft=${draft},draft_edited=${existing.draft_edited && !input.replaceDraft},needs_review=true,gm_attention=false where id=${id}`;
        const saved = await page.request.get(endpoint);
        await route.fulfill({ json: await saved.json() });
      },
    );
    await page.goto("/staff/enquiries");
    await page
      .getByRole("button", { name: "Open enquiry from " + name, exact: true })
      .click();
    await page.getByRole("tab", { name: /Assistant/ }).click();
    const assistant = page.getByRole("region", {
      name: "AI assistance",
      exact: true,
    });
    const draft = page.getByRole("textbox", {
      name: "Draft reply",
      exact: true,
    });
    await assistant
      .getByRole("button", { name: "Analyse enquiry", exact: true })
      .click();
    await expect(assistant.getByRole("status")).toContainText("Analysis saved");
    await expect(assistant).toContainText("35–45 guests");
    await expect(assistant).toContainText("year omitted by guest");
    await expect(draft).toContainText("[Sales-approved quote]");
    await draft.fill(
      "Sales will prepare a proposal.\n\n[Sales-approved quote]",
    );
    await page.getByRole("button", { name: "Save draft", exact: true }).click();
    await expect(
      page
        .getByRole("region", { name: "Draft reply", exact: true })
        .getByRole("status"),
    ).toContainText("Draft saved");
    await expect(
      assistant.getByRole("checkbox", {
        name: "Replace saved draft",
        exact: true,
      }),
    ).toBeVisible();
    await assistant
      .getByRole("button", { name: "Analyse enquiry", exact: true })
      .click();
    await expect(assistant.getByRole("status")).toContainText("Analysis saved");
    await expect(draft).toHaveValue(
      "Sales will prepare a proposal.\n\n[Sales-approved quote]",
    );
    expect(analysisCalls).toBe(2);
    await page.locator(".ei-quote > summary").click();
    const quote = page.locator(".ei-quote");
    await quote.getByLabel("Check-in", { exact: true }).fill("2026-11-20");
    await quote.getByLabel("Check-out", { exact: true }).fill("2026-11-22");
    await quote
      .getByRole("combobox", { name: "Room type", exact: true })
      .selectOption("garden-room");
    await quote.getByLabel("Adults", { exact: true }).fill("2");
    await quote.getByLabel("Children", { exact: true }).fill("0");
    const selection = {
      checkIn: "2026-11-20",
      checkOut: "2026-11-22",
      adults: 2,
      children: 0,
      items: [
        { roomTypeId: "garden-room", quantity: 1, adults: 2, children: 0 },
      ],
    };
    const authoritative = await page.request.post("/api/quotes", {
      headers: { origin: baseURL! },
      data: selection,
    });
    expect(authoritative.status()).toBe(200);
    const price = (await authoritative.json()).totalPaise;
    await quote
      .getByRole("button", { name: "Insert room quote", exact: true })
      .click();
    await expect(draft).toContainText("[Accommodation quote]");
    await expect(draft).toContainText("[Sales-approved quote]");
    const saved = await page.request.get(endpoint);
    expect((await saved.json()).enquiry.pricing.totalPaise).toBe(price);
    await page.reload();
    await page
      .getByRole("button", { name: "Open enquiry from " + name, exact: true })
      .click();
    await page.getByRole("tab", { name: /Assistant/ }).click();
    await expect(draft).toContainText("[Accommodation quote]");
    await expect(draft).toContainText("[Sales-approved quote]");
    await page.unroute("**/api/staff/enquiries/" + id + "/analyse");
    await page.route("**/api/staff/enquiries/" + id + "/analyse", (route) =>
      route.fulfill({
        status: 503,
        contentType: "application/json",
        body: JSON.stringify({
          error:
            "AI assistance could not be completed. Your enquiry and saved edits are safe.",
        }),
      }),
    );
    await page
      .getByRole("button", { name: "Analyse enquiry", exact: true })
      .click();
    await expect(assistant.getByRole("status")).toContainText(
      "The enquiry remains available for manual review.",
    );
    await expect(
      assistant.getByRole("button", { name: "Analyse enquiry", exact: true }),
    ).toBeEnabled();
    await expect(draft).toContainText("[Accommodation quote]");
    await expect(draft).toContainText("[Sales-approved quote]");
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.screenshot({
      path: info.outputPath("assistant-and-room-quote.png"),
      fullPage: true,
    });
  } finally {
    await db`delete from enquiries where contact_email=${email}`;
    await db.end();
  }
});
