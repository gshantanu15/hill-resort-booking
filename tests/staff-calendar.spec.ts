import { expect, test as base, type Page } from "@playwright/test";
import type { BrowserContext } from "playwright-core";
type StorageState = Awaited<ReturnType<BrowserContext["storageState"]>>;
import { DEMO_STAFF_EMAIL, DEMO_STAFF_PASSWORD } from "../src/lib/demo-staff";

const test = base.extend<object, { sharedStorageState: StorageState }>({
  sharedStorageState: [
    async ({ browser }, provide) => {
      const context = await browser.newContext();
      const response = await context.request.post(
        "http://localhost:3000/api/auth/sign-in/email",
        {
          data: { email: DEMO_STAFF_EMAIL, password: DEMO_STAFF_PASSWORD },
        },
      );
      if (!response.ok()) {
        throw new Error(`Shared staff sign-in failed (${response.status()})`);
      }
      const state = await context.storageState();
      await context.close();
      await provide(state);
    },
    { scope: "worker" },
  ],
  storageState: async ({ sharedStorageState }, provide) => {
    await provide(sharedStorageState);
  },
});

test.skip(
  !process.env.TEST_DATABASE_URL,
  "Requires an explicitly isolated TEST_DATABASE_URL",
);

const rows = [
  {
    roomTypeId: "estate-room",
    roomName: "Estate room",
    stayDate: "2026-11-03",
    pricePaise: 900000,
    allotment: 12,
    booked: 0,
    websiteLimit: 12,
    blackout: false,
  },
  {
    roomTypeId: "garden-room",
    roomName: "Garden room",
    stayDate: "2026-11-03",
    pricePaise: 1050000,
    allotment: 4,
    booked: 0,
    websiteLimit: 4,
    blackout: false,
  },
  {
    roomTypeId: "estate-villa",
    roomName: "Estate villa",
    stayDate: "2026-11-03",
    pricePaise: 1850000,
    allotment: 3,
    booked: 1,
    websiteLimit: 3,
    blackout: false,
  },
];

function fixtureRows(days = 31) {
  return Array.from({ length: days }, (_, offset) =>
    rows.map((row) => ({
      ...row,
      stayDate: new Date(Date.UTC(2026, 10, 3 + offset))
        .toISOString()
        .slice(0, 10),
    })),
  ).flat();
}

async function signIn(page: Page) {
  await page.goto("/staff");
  await expect(
    page.getByRole("heading", { name: "Rates & availability" }),
  ).toBeVisible();
}

test("calendar keeps an inclusive UI range and preserves per-night drafts", async ({
  page,
}) => {
  const requests: Array<{ method: string; url: string; body?: unknown }> = [];
  const serverRows = fixtureRows();
  await page.route("**/api/staff/inventory**", async (route) => {
    const request = route.request();
    requests.push({
      method: request.method(),
      url: request.url(),
      body: request.postDataJSON(),
    });
    if (request.method() === "PATCH") {
      const patch = request.postDataJSON() as (typeof rows)[number];
      const saved = serverRows.find(
        (row) =>
          row.roomTypeId === patch.roomTypeId &&
          row.stayDate === patch.stayDate,
      );
      if (saved) {
        Object.assign(saved, {
          pricePaise: patch.pricePaise,
          allotment: patch.allotment,
          blackout: patch.blackout,
        });
      }
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ ok: true }),
      });
      return;
    }
    const url = new URL(request.url());
    const start = url.searchParams.get("start");
    const end = url.searchParams.get("end");
    const responseRows = serverRows.filter(
      (row) =>
        (!start || row.stayDate >= start) && (!end || row.stayDate < end),
    );
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ rows: responseRows }),
    });
  });
  await signIn(page);

  await page.getByRole("button", { name: "Choose stay nights" }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  const firstDay = page.locator(".staff-date-cell[data-selection-start]");
  await expect(firstDay).toBeVisible();
  expect((await firstDay.boundingBox())!.height).toBeGreaterThanOrEqual(44);
  await firstDay.focus();
  await page.keyboard.press("ArrowRight");
  await expect(page.locator(".staff-date-cell[data-focused]")).toContainText(
    "4",
  );
  await page.getByText("Enter dates instead", { exact: true }).click();
  await page.getByLabel("First stay night").fill("2026-11-03");
  await page.getByLabel("Last stay night").fill("2026-11-09");
  await page.getByRole("button", { name: "Show nights" }).click();
  await expect(page.getByText("7 stay nights", { exact: true })).toBeVisible();
  const getRequest = requests.find((request) => request.method === "GET");
  expect(getRequest?.url).toContain("start=2026-11-03");
  expect(getRequest?.url).toContain("end=2026-11-10");

  // Draft estate first, then persist garden; the estate draft must survive the refetch.
  await page.getByTestId("night-estate-room-2026-11-03").click();
  await page.getByLabel("Nightly rate, including GST").fill("9100.00");
  await page.getByTestId("night-garden-room-2026-11-03").click();
  await page.getByLabel("Nightly rate, including GST").fill("10900.00");
  await page.getByLabel("Website allotment").fill("3");
  await page.getByRole("button", { name: "Save night" }).click();
  await expect(page.getByRole("status")).toContainText(/saved|updated/i);
  const patch = requests.find((request) => request.method === "PATCH");
  expect(patch?.body).toMatchObject({
    roomTypeId: "garden-room",
    stayDate: "2026-11-03",
    pricePaise: 1090000,
    allotment: 3,
    blackout: false,
  });
  expect(patch?.body).not.toHaveProperty("booked");
  expect(patch?.body).not.toHaveProperty("websiteLimit");

  // Keep the estate draft through a range switch and refetch.
  await page.getByRole("button", { name: "Choose stay nights" }).click();
  await page.getByText("Enter dates instead", { exact: true }).click();
  await page.getByLabel("First stay night").fill("2026-11-10");
  await page.getByLabel("Last stay night").fill("2026-11-16");
  await page.getByRole("button", { name: "Show nights" }).click();
  await page.getByText("1 unsaved night", { exact: true }).click();
  await page
    .getByRole("button", {
      name: "Review unsaved night Estate room, 2026-11-03",
    })
    .click();
  await page.getByTestId("night-estate-room-2026-11-03").click();
  await expect(page.getByLabel("Nightly rate, including GST")).toHaveValue(
    "9100.00",
  );
  await page.getByTestId("night-garden-room-2026-11-03").click();
  await page.getByLabel("Nightly rate, including GST").fill("11100.00");
  await expect(page.getByLabel("Nightly rate, including GST")).toHaveValue(
    "11100.00",
  );
  await page.getByRole("button", { name: "Reset this night" }).click();
  await expect(page.getByLabel("Nightly rate, including GST")).toHaveValue(
    "10900.00",
  );
  expect(requests.filter((request) => request.method === "PATCH")).toHaveLength(
    1,
  );
});

test("calendar exposes safe load and save failures without implying success", async ({
  page,
}) => {
  let failLoad = true;
  let failRefresh = false;
  let loaded = false;
  const serverRows = fixtureRows();
  await page.route("**/api/staff/inventory**", async (route) => {
    if (route.request().method() === "PATCH") {
      await route.fulfill({
        status: 409,
        contentType: "application/json",
        body: JSON.stringify({
          error:
            "Allotment cannot be below booked rooms or above the website ceiling.",
        }),
      });
      return;
    }
    if (failLoad) {
      failLoad = false;
      await route.fulfill({
        status: 503,
        contentType: "application/json",
        body: JSON.stringify({ error: "Database unavailable." }),
      });
      return;
    }
    if (failRefresh) {
      failRefresh = false;
      await route.fulfill({
        status: 503,
        contentType: "application/json",
        body: JSON.stringify({ error: "Database unavailable." }),
      });
      return;
    }
    loaded = true;
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ rows: serverRows }),
    });
  });
  await signIn(page);
  await expect(page.locator("#staff-calendar-error")).toContainText(
    /Database unavailable/i,
  );
  await expect(
    page.getByRole("button", { name: "Choose stay nights" }),
  ).toBeVisible();
  await page.getByRole("button", { name: /Refresh/i }).click();
  await expect(page.getByTestId("night-garden-room-2026-11-03")).toBeVisible();
  expect(loaded).toBe(true);
  failRefresh = true;
  await page.getByRole("button", { name: /Refresh/i }).click();
  await expect(page.locator("#staff-calendar-error")).toContainText(
    /Database unavailable/i,
  );
  await expect(page.getByTestId("night-garden-room-2026-11-03")).toBeVisible();
  await page.getByTestId("night-garden-room-2026-11-03").click();
  const rateInput = page.getByLabel("Nightly rate, including GST");
  await expect(rateInput).toHaveValue("10500.00");
  // The mobile dialog deliberately focuses the rate after opening; wait before editing another field.
  if ((page.viewportSize()?.width ?? 1440) < 700)
    await expect(rateInput).toBeFocused();
  await page.getByLabel("Website allotment").fill("3");
  await expect(rateInput).toHaveValue("10500.00");
  await page.getByRole("button", { name: "Save night" }).click();
  await expect(page.locator("#staff-calendar-error")).toContainText(
    /ceiling|booked/i,
  );
  await expect(
    page.locator('[role="status"]').filter({ hasText: /saved|updated/i }),
  ).toHaveCount(0);
  await expect(page.getByLabel("Website allotment")).toHaveValue("3");
});

test("calendar keeps mobile editing reachable and closes the date dialog with focus return", async ({
  page,
}) => {
  await page.route("**/api/staff/inventory**", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ rows }),
    });
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await signIn(page);
  await page.getByRole("button", { name: "Choose stay nights" }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toBeHidden();
  await expect(
    page.getByRole("button", { name: "Choose stay nights" }),
  ).toBeFocused();
  await page.getByTestId("night-garden-room-2026-11-03").click();
  await expect(page.getByLabel("Nightly rate, including GST")).toBeVisible();
  await expect(page.getByLabel("Nightly rate, including GST")).toBeFocused();
});

test("calendar paginates long ranges and does not synthesize missing nights", async ({
  page,
}) => {
  const availableRows = fixtureRows(31).filter(
    (row) => row.stayDate !== "2026-11-05",
  );
  await page.route("**/api/staff/inventory**", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ rows: availableRows }),
    });
  });
  await signIn(page);
  const chooseRange = async (first: string, last: string) => {
    await page.getByRole("button", { name: "Choose stay nights" }).click();
    await page.getByText("Enter dates instead", { exact: true }).click();
    await page.getByLabel("First stay night").fill(first);
    await page.getByLabel("Last stay night").fill(last);
    await page.getByRole("button", { name: "Show nights" }).click();
  };
  await chooseRange("2026-11-03", "2026-11-16");
  await expect(page.getByText("Week 1 of 2", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: /Next week/i }).click();
  await expect(page.getByText("Week 2 of 2", { exact: true })).toBeVisible();
  await chooseRange("2026-11-03", "2026-12-03");
  await expect(page.getByText("Week 1 of 5", { exact: true })).toBeVisible();
  for (let index = 0; index < 4; index += 1) {
    await page.getByRole("button", { name: /Next week/i }).click();
  }
  await expect(page.getByText("Week 5 of 5", { exact: true })).toBeVisible();
  await chooseRange("2026-11-03", "2026-11-09");
  await expect(page.getByTestId("night-garden-room-2026-11-05")).toHaveCount(0);
});
