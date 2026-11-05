import { expect, test } from "@playwright/test";
import postgres from "postgres";
import { readFileSync } from "node:fs";
import { parse } from "dotenv";

test("mixed booking recovers from decline, changed quote and lost success response", async ({
  page,
}, info) => {
  test.skip(
    !process.env.TEST_DATABASE_URL,
    "Requires an explicitly isolated test database",
  );
  const testUrl = process.env.TEST_DATABASE_URL!;
  const host = (value: string) =>
    new URL(value).hostname.replace("-pooler", "");
  for (const file of [".env.local", ".env.demo.local"]) {
    try {
      const env = parse(readFileSync(file));
      expect(host(testUrl)).not.toBe(host(env.DATABASE_URL));
    } catch (e) {
      if ((e as NodeJS.ErrnoException).code !== "ENOENT") throw e;
    }
  }
  expect(host(testUrl)).toBe(host(process.env.DATABASE_URL!));
  const db = postgres(testUrl, { prepare: false, connect_timeout: 10 });
  const before =
    await db`select * from nightly_inventory where room_type_id in ('estate-room','estate-villa') and stay_date >= '2026-11-10' and stay_date < '2026-11-12' order by room_type_id,stay_date`;
  const [rate] =
    await db`select price_paise from nightly_rates where room_type_id='estate-room' and stay_date='2026-11-10' and rate_plan_id='standard-stay'`;
  let submission: string | undefined, booking: string | undefined;
  try {
    expect(before).toHaveLength(4);
    await page.goto("/book?room=estate-room");
    await page
      .getByRole("button", { name: "Choose check-in and check-out dates" })
      .click();
    await page.getByText("Enter dates instead", { exact: true }).click();
    await page.getByLabel("Check-in", { exact: true }).fill("2026-11-10");
    await page.getByLabel("Check-out", { exact: true }).fill("2026-11-12");
    await page.getByRole("button", { name: "Apply dates" }).click();
    await expect(page.getByLabel("Total adults", { exact: true })).toHaveCount(
      0,
    );
    await expect(
      page.getByLabel("Total children", { exact: true }),
    ).toHaveCount(0);
    await page
      .getByRole("button", { name: "Add Estate room", exact: true })
      .click();
    await page.getByLabel("Estate room children", { exact: true }).fill("1");
    await page
      .getByRole("button", { name: "Add Estate villa", exact: true })
      .click();
    await page.getByLabel("Estate villa adults", { exact: true }).fill("2");
    await page.screenshot({
      path: info.outputPath("selection.png"),
      fullPage: true,
    });
    await page
      .getByRole("button", { name: "Continue to review", exact: true })
      .click();
    await expect(
      page.getByRole("heading", { name: "Your details and review" }),
    ).toBeVisible();
    await page.getByLabel("Full name").fill("Synthetic Day Three");
    await page.getByLabel("Email", { exact: true }).fill("day3@example.test");
    await page.getByLabel(/accept the booking terms/i).check();
    await page.getByLabel(/use of my booking details/i).check();
    await page.reload();
    await expect(page.getByLabel("Full name")).toHaveValue(
      "Synthetic Day Three",
    );
    await page
      .getByRole("button", { name: "Continue to test payment" })
      .click();
    await page.getByRole("switch", { name: "Test payment outcome" }).click();
    await page.getByRole("button", { name: /^Pay ₹/ }).click();
    await expect(page.locator(".booking-alert")).toContainText(
      "Test payment declined",
    );
    const afterFailure =
      await db`select * from nightly_inventory where room_type_id in ('estate-room','estate-villa') and stay_date >= '2026-11-10' and stay_date < '2026-11-12' order by room_type_id,stay_date`;
    expect(afterFailure).toEqual(before);
    await page.getByRole("switch", { name: "Test payment outcome" }).click();
    await page.screenshot({
      path: info.outputPath("payment.png"),
      fullPage: true,
    });
    await db`update nightly_rates set price_paise=${rate.price_paise + 10000} where room_type_id='estate-room' and stay_date='2026-11-10' and rate_plan_id='standard-stay'`;
    await page.getByRole("button", { name: /^Pay ₹/ }).click();
    await expect(
      page.getByRole("button", { name: "Accept updated total and continue" }),
    ).toBeVisible();
    await page.reload();
    await page
      .getByRole("button", { name: "Accept updated total and continue" })
      .click();
    let original: unknown;
    let submitted = 0;
    await page.route("**/api/bookings", async (route) => {
      submitted++;
      original = route.request().postDataJSON();
      expect(original).toMatchObject({ selection: { adults: 4, children: 1 } });
      submission = (original as { submissionId: string }).submissionId;
      const response = await route.fetch();
      expect(response.ok()).toBeTruthy();
      booking = (await response.json()).id;
      await route.abort("failed");
    });
    await page.getByRole("button", { name: /^Pay ₹/ }).evaluate((button) => {
      (button as HTMLButtonElement).click();
      (button as HTMLButtonElement).click();
    });
    await expect(page.locator(".booking-alert")).toContainText(
      "could not verify",
    );
    await expect(
      page.getByRole("button", { name: "Back to review" }),
    ).toBeDisabled();
    expect(submitted).toBe(1);
    await page.reload();
    await page.unroute("**/api/bookings");
    await page.route("**/api/bookings", async (route) => {
      expect(route.request().postDataJSON()).toEqual(original);
      await route.continue();
    });
    await page.getByRole("button", { name: "Retry saved payment" }).click();
    await expect(page).toHaveURL(new RegExp(`/book/confirmation/${booking}$`));
    await expect(
      page.getByRole("heading", { name: "Your demo booking is saved." }),
    ).toBeVisible();
    await expect(page.locator(".guest-summary")).toHaveText(
      "4 adults, 1 child",
    );
    expect(
      (await page.locator(".stay-summary").textContent())?.match(
        /10 November 2026/g,
      ),
    ).toHaveLength(1);
    await expect(
      page.getByRole("button", { name: "Save confirmation" }),
    ).toHaveCount(0);
    await expect(page.locator(".confirmation-email-followup")).toContainText(
      "No email is sent from this page",
    );
    await page
      .getByRole("button", { name: "Preview confirmation email" })
      .click();
    await expect(page.getByRole("dialog")).toContainText(booking!);
    await expect(page.getByRole("dialog")).not.toContainText(
      "day3@example.test",
    );
    await page.keyboard.press("Escape");
    await page
      .context()
      .grantPermissions(["clipboard-read", "clipboard-write"]);
    await page
      .getByRole("button", { name: "Copy reference", exact: true })
      .click();
    await expect(
      page.getByRole("button", { name: "Reference copied", exact: true }),
    ).toBeVisible();
    expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(
      booking,
    );
    await expect(
      page.getByRole("button", { name: "Copy reference", exact: true }),
    ).toBeVisible();
    await page.evaluate(() =>
      Object.defineProperty(navigator, "clipboard", {
        configurable: true,
        value: {
          writeText: async () => {
            throw Error("Clipboard denied");
          },
        },
      }),
    );
    await page
      .getByRole("button", { name: "Copy reference", exact: true })
      .click();
    await expect(
      page.getByRole("button", { name: /Reference selected/ }),
    ).toBeVisible();
    expect(await page.evaluate(() => getSelection()?.toString())).toBe(booking);
    await page.reload();
    await expect(page.getByText(booking!, { exact: true })).toBeVisible();
    expect(
      await db`select id from bookings where submission_id=${submission!}`,
    ).toHaveLength(1);
    const after =
      await db`select * from nightly_inventory where room_type_id in ('estate-room','estate-villa') and stay_date >= '2026-11-10' and stay_date < '2026-11-12' order by room_type_id,stay_date`;
    for (let i = 0; i < before.length; i++)
      expect(after[i].booked).toBe(
        before[i].booked + (before[i].room_type_id === "estate-room" ? 2 : 1),
      );
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await page.screenshot({
      path: info.outputPath("confirmation.png"),
      fullPage: true,
    });
  } finally {
    if (submission) {
      const found =
        await db`select id from bookings where submission_id=${submission}`;
      for (const b of found) {
        await db`delete from booking_nights where booking_id=${b.id}`;
        await db`delete from booking_items where booking_id=${b.id}`;
        await db`delete from bookings where id=${b.id}`;
      }
    }
    for (const row of before)
      await db`update nightly_inventory set booked=${row.booked} where room_type_id=${row.room_type_id} and stay_date=${row.stay_date}`;
    await db`update nightly_rates set price_paise=${rate.price_paise} where room_type_id='estate-room' and stay_date='2026-11-10' and rate_plan_id='standard-stay'`;
    await db.end();
  }
});

test("selection validates dates and inferred guest capacity", async ({
  page,
}) => {
  await page.goto("/book?room=estate-room");
  await page
    .getByRole("button", { name: "Choose check-in and check-out dates" })
    .click();
  await page.getByText("Enter dates instead", { exact: true }).click();
  await page.getByLabel("Check-in", { exact: true }).fill("2026-11-10");
  await page.getByLabel("Check-out", { exact: true }).fill("2026-11-09");
  await page.getByRole("button", { name: "Apply dates" }).click();
  await expect(page.locator(".guest-date-picker__error")).toContainText(
    "Check-out must be after",
  );
  await page.getByLabel("Check-out", { exact: true }).fill("2026-11-12");
  await page.getByRole("button", { name: "Apply dates" }).click();
  await page.getByLabel("Estate room children", { exact: true }).fill("2");
  await page.getByRole("button", { name: "Continue to review" }).click();
  await expect(page.locator(".booking-alert")).toContainText("capacity");
  await page
    .getByRole("button", { name: "Remove Estate room", exact: true })
    .click();
  await expect(
    page.getByLabel("Estate room quantity", { exact: true }),
  ).toHaveText("0");
  await expect(
    page.getByLabel("Estate room children", { exact: true }),
  ).toHaveCount(0);
});

test("guest calendar uses departure endpoint and room controls respect bounds without hover reveal", async ({
  page,
}) => {
  let stock = 2;
  await page.route("**/api/availability?**", (route) =>
    route.fulfill({
      json: {
        rooms: [
          { roomTypeId: "estate-room", available: stock, reason: null },
          { roomTypeId: "garden-room", available: 0, reason: "Sold out" },
          { roomTypeId: "estate-villa", available: 1, reason: null },
        ],
      },
    }),
  );
  await page.goto("/book?room=estate-room");
  await page
    .getByRole("button", { name: "Choose check-in and check-out dates" })
    .click();
  await page.locator(".guest-date-cell").filter({ hasText: /^10$/ }).click();
  await page.locator(".guest-date-cell").filter({ hasText: /^12$/ }).click();
  await page.getByRole("button", { name: "Apply dates" }).click();
  await expect(
    page.getByRole("button", { name: "Choose check-in and check-out dates" }),
  ).toContainText("12 Nov 2026");
  await expect(
    page.getByRole("button", { name: "Add Estate room", exact: true }),
  ).toBeEnabled();
  await page
    .getByRole("button", { name: "Add Estate room", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Add Estate room", exact: true }),
  ).toBeDisabled();
  await expect(
    page.getByRole("button", { name: "Add Garden room", exact: true }),
  ).toBeDisabled();
  await expect(page.getByText(/2 available for/)).toHaveCount(0);
  const summary = page.locator(".room-details summary").first();
  await summary.hover();
  await expect(page.locator(".room-details[open]")).toHaveCount(0);
  await summary.focus();
  await expect(page.locator(".room-details[open]")).toHaveCount(0);
  await page.keyboard.press("Enter");
  await expect(page.locator(".room-details[open]")).toHaveCount(1);
  await page.keyboard.press("Escape");
  await expect(page.locator(".room-details[open]")).toHaveCount(0);
  stock = 1;
  await page
    .getByRole("button", { name: "Choose check-in and check-out dates" })
    .click();
  await page.getByText("Enter dates instead", { exact: true }).click();
  await page.getByLabel("Check-in", { exact: true }).fill("2026-11-11");
  await page.getByLabel("Check-out", { exact: true }).fill("2026-11-13");
  await page.getByRole("button", { name: "Apply dates" }).click();
  await expect(
    page.getByText(
      "Your selected quantity is no longer available. Reduce it or change dates.",
    ),
  ).toBeVisible();
  await expect(
    page.getByLabel("Estate room quantity", { exact: true }),
  ).toHaveText("2");
});

test("restored unsubmitted drafts derive guest totals before quoting", async ({
  page,
}) => {
  await page.addInitScript(() =>
    sessionStorage.setItem(
      "aavana-booking-draft",
      JSON.stringify({
        selection: {
          checkIn: "2026-11-10",
          checkOut: "2026-11-12",
          adults: 99,
          children: 99,
          items: [
            { roomTypeId: "estate-room", quantity: 1, adults: 2, children: 0 },
          ],
        },
        contact: { name: "", email: "", phone: "" },
        step: 1,
        quote: null,
        pending: null,
        accepted: false,
      }),
    ),
  );
  await page.route("**/api/quotes", async (route) => {
    expect(route.request().postDataJSON()).toMatchObject({
      adults: 2,
      children: 0,
    });
    await route.fulfill({
      status: 409,
      json: { error: "Synthetic no-write quote check" },
    });
  });
  await page.goto("/book");
  await expect(page.locator(".allocation-heading")).toContainText("2 guests");
  await page.getByRole("button", { name: "Continue to review" }).click();
  await expect(page.locator(".booking-alert")).toContainText(
    "Synthetic no-write quote check",
  );
});

test("missing dates and contact policy controls stay actionable", async ({
  page,
}) => {
  await page.goto("/book?room=estate-room");
  await page.getByRole("button", { name: "Continue to review" }).click();
  await expect(page.locator(".booking-alert")).toContainText(
    "Choose both an arrival and a departure",
  );
  await expect(page.locator(".booking-alert")).not.toContainText(
    "invalid_format",
  );
  await page.screenshot({
    path: test.info().outputPath("missing-dates.png"),
    fullPage: true,
  });

  await page
    .getByRole("button", { name: "Choose check-in and check-out dates" })
    .click();
  await page.locator(".guest-date-cell").filter({ hasText: /^10$/ }).click();
  await page.locator(".guest-date-cell").filter({ hasText: /^12$/ }).click();
  await page.getByRole("button", { name: "Apply dates" }).click();
  await page.getByRole("button", { name: "Continue to review" }).click();
  await page.getByLabel("Full name").fill("Policy Test");
  await page.getByLabel("Email", { exact: true }).fill("policy@example.test");
  await page
    .getByLabel("Phone (optional)", { exact: true })
    .fill("not a phone");
  await page.getByRole("button", { name: "Continue to test payment" }).click();
  await expect(page.locator("#phone-error")).toContainText("valid phone");
  await page.screenshot({
    path: test.info().outputPath("phone-error.png"),
    fullPage: true,
  });
  await page.getByLabel("Phone (optional)", { exact: true }).fill("");
  await page.getByRole("button", { name: "Continue to test payment" }).click();
  await expect(page.locator(".booking-consent")).toBeVisible();
  await page.getByRole("button", { name: "Read booking terms" }).click();
  await expect(page.locator(".booking-policy-dialog")).toBeVisible();
  const dialogBounds = await page
    .locator(".booking-policy-dialog")
    .boundingBox();
  expect(dialogBounds!.x).toBeGreaterThan(8);
  expect(dialogBounds!.y).toBeGreaterThan(8);
  await expect(page.locator(".booking-policy-dialog")).toContainText(
    "Non-binding review draft",
  );
  await page.screenshot({ path: test.info().outputPath("policy-dialog.png") });
  await page
    .locator(".booking-policy-dialog-body")
    .evaluate((element) => (element.scrollTop = element.scrollHeight));
  await expect(
    page.getByRole("button", { name: "Return to review", exact: true }),
  ).toBeInViewport();
  await page
    .getByRole("button", { name: "Return to review", exact: true })
    .focus();
  await page.keyboard.press("Tab");
  await expect(
    page.getByRole("button", { name: "Close policy" }),
  ).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(page.getByLabel(/accept the booking terms/i)).not.toBeChecked();
  await expect(
    page.getByRole("button", { name: "Read booking terms" }),
  ).toBeFocused();
  await page.getByLabel(/accept the booking terms/i).check();
  await page.getByLabel(/data-use notice/i).check();
  await page.getByRole("button", { name: "Continue to test payment" }).click();
  await expect(
    page.getByRole("heading", { name: "Review and pay" }),
  ).toBeVisible();
});
