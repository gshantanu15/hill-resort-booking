import assert from "node:assert/strict";
import { chromium, expect } from "@playwright/test";

const target = new URL(process.argv[2] ?? "");
assert.equal(target.protocol, "https:");
assert.match(
  target.hostname,
  /^hill-resort-booking(?:-[a-z0-9]+-shans-projects-5a3cd5ba)?\.vercel\.app$/,
);
assert.equal(target.href, target.origin + "/");
const checkIn = process.argv[3];
const checkOut = process.argv[4];
for (const date of [checkIn, checkOut])
  assert.match(date ?? "", /^\d{4}-\d{2}-\d{2}$/);
assert.ok(checkOut > checkIn);

const bypass = process.env.VERCEL_AUTOMATION_BYPASS_SECRET;
const headers = bypass ? { "x-vercel-protection-bypass": bypass } : {};
const browser = await chromium.launch();
try {
  for (const width of [1440, 390]) {
    const context = await browser.newContext({
      baseURL: target.origin,
      viewport: { width, height: 844 },
      serviceWorkers: "block",
    });
    const errors = [];
    try {
      // Application writes are blocked. The read-only quote is issued separately.
      await context.route("**/*", async (route) => {
        const request = route.request();
        if (new URL(request.url()).origin !== target.origin)
          return route.abort();
        if (!["GET", "HEAD"].includes(request.method())) {
          errors.push(
            `Blocked ${request.method()} ${new URL(request.url()).pathname}`,
          );
          return route.abort();
        }
        return route.continue({
          headers: { ...request.headers(), ...headers },
        });
      });
      const page = await context.newPage();
      page.setDefaultTimeout(8000);
      page.on("pageerror", (error) => errors.push(error.message));
      await page.goto("/", { waitUntil: "domcontentloaded", timeout: 15000 });
      await expect(page.getByRole("heading", { level: 1 })).toContainText(
        "Leave the hurry",
      );
      await expect(
        page.getByRole("link", { name: "Choose this stay" }),
      ).toHaveCount(3);
      await page
        .getByText("About this demo & photographs", { exact: true })
        .click();
      await expect(
        page.getByText(/Room catalogue connected to PostgreSQL/),
      ).toBeVisible();
      if (width === 390) {
        await page.getByRole("button", { name: "Open navigation" }).click();
        await page
          .getByRole("dialog")
          .getByRole("link", { name: "Enquiries" })
          .click();
      } else {
        await page
          .getByRole("navigation", { name: "Main navigation" })
          .getByRole("link", { name: "Enquiries" })
          .click();
      }
      await expect(
        page.getByRole("button", { name: "Send enquiry" }),
      ).toBeVisible();
      await expect(page.locator(".enquiry-photo img")).toHaveAttribute(
        "src",
        /shade-coffee/,
      );
      await expect(page.locator(".guest-footer-photo")).toHaveAttribute(
        "src",
        /green-hills-road/,
      );
      assert.equal(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
        true,
      );

      await page.goto("/book?room=estate-room", {
        waitUntil: "domcontentloaded",
        timeout: 15000,
      });
      await expect(
        page.getByRole("button", {
          name: "Choose check-in and check-out dates",
        }),
      ).toBeVisible();
      const requestOptions = { headers, timeout: 10000, maxRedirects: 0 };
      const dates = new URLSearchParams({ checkIn, checkOut });
      const availability = await context.request.get(
        `/api/availability?${dates}`,
        requestOptions,
      );
      assert.equal(availability.status(), 200, "Availability response");
      assert.ok(
        (await availability.json()).rooms.some(
          (room) => room.roomTypeId === "estate-room" && room.available > 0,
        ),
      );
      const quote = await context.request.post("/api/quotes", {
        ...requestOptions,
        headers: { ...headers, origin: target.origin },
        data: {
          checkIn,
          checkOut,
          adults: 2,
          children: 0,
          items: [
            { roomTypeId: "estate-room", quantity: 1, adults: 2, children: 0 },
          ],
        },
      });
      assert.equal(quote.status(), 200, "Quote response");
      const priced = await quote.json();
      assert.ok(
        priced.totalPaise > 0 &&
          priced.totalPaise === priced.subtotalPaise + priced.taxPaise,
      );

      await page.goto("/staff/login", {
        waitUntil: "domcontentloaded",
        timeout: 15000,
      });
      await expect(
        page.getByRole("heading", { name: "Staff sign in" }),
      ).toBeVisible();
      const staff = await context.request.get(
        "/api/staff/inventory",
        requestOptions,
      );
      assert.ok([401, 403].includes(staff.status()), "Anonymous staff access");
      assert.deepEqual(errors, []);
      console.log(`${width}px guest smoke passed for ${target.hostname}`);
    } finally {
      await context.close();
    }
  }
} finally {
  await browser.close();
}
