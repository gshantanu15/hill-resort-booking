import { expect, test } from "@playwright/test";
import { DEMO_STAFF_EMAIL, DEMO_STAFF_PASSWORD } from "../src/lib/demo-staff";
import postgres from "postgres";
import { randomUUID } from "node:crypto";

test.skip(
  !process.env.TEST_DATABASE_URL,
  "Requires an explicitly isolated TEST_DATABASE_URL",
);
test.describe.configure({ mode: "serial" });
const start = "2026-11-10",
  end = "2026-11-12";
const selection = {
  checkIn: start,
  checkOut: end,
  adults: 4,
  children: 1,
  items: [
    { roomTypeId: "estate-room", quantity: 2, adults: 2, children: 1 },
    { roomTypeId: "estate-villa", quantity: 1, adults: 2, children: 0 },
  ],
};

type CalendarRow = {
  roomTypeId: string;
  stayDate: string;
  pricePaise: number;
  allotment: number;
  booked: number;
  websiteLimit: number;
  blackout: boolean;
};
test("staff calendar and booking API contracts", async ({
  page,
  request,
  baseURL,
}) => {
  const pub = request;
  const db = postgres(process.env.TEST_DATABASE_URL!, { prepare: false });
  const touched: CalendarRow[] = [];
  const created: string[] = [];
  const patchCalendar = (data: unknown) =>
    page.request.patch("/api/staff/inventory", {
      data,
      headers: { origin: baseURL! },
    });
  try {
    expect((await pub.get("/api/staff/inventory")).status()).toBe(401);
    expect(
      (await pub.patch("/api/staff/inventory", { data: {} })).status(),
    ).toBe(401);
    expect(
      (
        await pub.post("/api/auth/sign-up/email", {
          headers: { origin: baseURL! },
          data: {
            name: "Disabled",
            email: `disabled-${Date.now()}@example.test`,
            password: "ChangeMe123!",
          },
        })
      ).status(),
    ).toBeGreaterThanOrEqual(400);
    await page.goto("/staff/login");
    await page.getByLabel("Email").fill(DEMO_STAFF_EMAIL);
    await page.getByLabel("Password").fill(DEMO_STAFF_PASSWORD);
    await page.getByRole("button", { name: "Sign in" }).click();
    await expect(
      page.getByRole("heading", { name: "Calendar editor" }),
    ).toBeVisible();
    await page.getByLabel("From").fill(start);
    await page.getByLabel("Through (exclusive)").fill(end);
    await page.getByRole("button", { name: "Load calendar" }).click();
    await expect(page.locator(".staff-table tbody tr")).not.toHaveCount(0);
    const before = await page.request.get(
      `/api/staff/inventory?start=${start}&end=${end}`,
    );
    expect(before.ok()).toBeTruthy();
    const rows = (await before.json()).rows;
    touched.push(...rows);
    const row = (rows as CalendarRow[]).find(
      (r) => r.roomTypeId === "estate-room" && r.stayDate === start,
    )!;
    expect(row).toBeTruthy();
    const quoteResponse = await page.request.post("/api/quotes", {
      data: selection,
    });
    expect(quoteResponse.ok()).toBeTruthy();
    const quote = await quoteResponse.json();
    expect(
      (
        await page.request.get(
          `/api/availability?checkIn=${start}&checkOut=${end}`,
        )
      ).ok(),
    ).toBeTruthy();
    const patch = {
      roomTypeId: "estate-room",
      stayDate: start,
      ratePlanId: "standard-stay",
      pricePaise: row.pricePaise + 10000,
      allotment: row.allotment,
      blackout: false,
    };
    expect(
      (
        await page.request.patch("/api/staff/inventory", {
          data: patch,
          headers: { origin: "https://untrusted.example" },
        })
      ).status(),
    ).toBe(403);
    expect((await patchCalendar(patch)).ok()).toBeTruthy();
    const stale = await page.request.post("/api/bookings", {
      data: {
        selection,
        contact: { name: "Day Two", email: "day2@example.test" },
        submissionId: crypto.randomUUID(),
        quoteToken: quote.token,
        paymentOutcome: "success",
      },
    });
    expect(stale.status()).toBe(409);
    expect((await stale.json()).code).toBe("QUOTE_CHANGED");
    const freshResponse = await page.request.post("/api/quotes", {
      data: selection,
    });
    const fresh = await freshResponse.json();
    const confirmed = await page.request.post("/api/bookings", {
      data: {
        selection,
        contact: { name: "Day Two", email: "day2@example.test" },
        submissionId: crypto.randomUUID(),
        quoteToken: fresh.token,
        paymentOutcome: "success",
      },
    });
    expect(confirmed.ok()).toBeTruthy();
    const saved = await confirmed.json();
    created.push(saved.id);
    await page.screenshot({
      path: `test-results/staff-calendar-${test.info().project.name}.png`,
      fullPage: true,
    });
    expect(
      (
        await patchCalendar({
          ...patch,
          pricePaise: row.pricePaise,
          blackout: true,
        })
      ).ok(),
    ).toBeTruthy();
    expect(await (await pub.get(`/api/bookings/${saved.id}`)).json()).toEqual(
      saved,
    );
    const blocked = await page.request.post("/api/quotes", { data: selection });
    expect(blocked.status()).toBe(409);
    expect((await blocked.json()).code).toBe("UNAVAILABLE");
    expect(
      (
        await patchCalendar({ ...patch, allotment: 0, blackout: false })
      ).status(),
    ).toBe(409);
    expect(
      (
        await patchCalendar({ ...patch, allotment: row.websiteLimit + 1 })
      ).status(),
    ).toBe(409);
    expect((await patchCalendar({ ...patch, booked: 0 })).status()).toBe(400);
    expect(
      (await patchCalendar({ ...patch, pricePaise: 850000 })).status(),
    ).toBe(400);
    await page.getByRole("button", { name: "Sign out" }).click();
    await expect(page).toHaveURL(/staff\/login/);
    expect(
      (
        await page.request.get(`/api/staff/inventory?start=${start}&end=${end}`)
      ).status(),
    ).toBe(401);
  } finally {
    await db.begin(async (tx) => {
      for (const id of created) {
        await tx`DELETE FROM booking_nights WHERE booking_id = ${id}`;
        await tx`DELETE FROM booking_items WHERE booking_id = ${id}`;
        await tx`DELETE FROM bookings WHERE id = ${id}`;
      }
      for (const row of touched) {
        await tx`UPDATE nightly_inventory SET allotment = ${row.allotment}, blackout = ${row.blackout}, booked = ${row.booked} WHERE room_type_id = ${row.roomTypeId} AND stay_date = ${row.stayDate}`;
        await tx`UPDATE nightly_rates SET price_paise = ${row.pricePaise} WHERE room_type_id = ${row.roomTypeId} AND rate_plan_id = 'standard-stay' AND stay_date = ${row.stayDate}`;
      }
    });
    await db.end();
  }
});

test("a signed-in guest cannot access staff data or grant themselves a staff role", async ({
  request,
  baseURL,
}) => {
  const db = postgres(process.env.TEST_DATABASE_URL!, { prepare: false });
  const id = randomUUID();
  const email = `guest-${id}@example.test`;
  try {
    const [account] =
      await db`SELECT a.password FROM app_account a JOIN app_user u ON u.id=a.user_id WHERE u.email=${DEMO_STAFF_EMAIL} AND a.provider_id='credential'`;
    expect(account?.password).toBeTruthy();
    await db.begin(async (tx) => {
      await tx`INSERT INTO app_user(id,name,email,email_verified,role) VALUES(${id},'Synthetic Guest',${email},true,'guest')`;
      await tx`INSERT INTO app_account(id,account_id,provider_id,user_id,password,created_at,updated_at) VALUES(${randomUUID()},${id},'credential',${id},${account.password},now(),now())`;
    });
    const login = await request.post("/api/auth/sign-in/email", {
      data: { email, password: DEMO_STAFF_PASSWORD },
      headers: { origin: baseURL! },
    });
    expect(login.ok()).toBeTruthy();
    expect(
      (
        await request.get(`/api/staff/inventory?start=${start}&end=${end}`)
      ).status(),
    ).toBe(403);
    expect(
      (
        await request.patch("/api/staff/inventory", {
          data: {},
          headers: { origin: baseURL! },
        })
      ).status(),
    ).toBe(403);
    expect(
      (
        await request.post("/api/auth/update-user", {
          data: { role: "staff" },
          headers: { origin: baseURL! },
        })
      ).ok(),
    ).toBe(false);
    expect(
      (
        await request.get(`/api/staff/inventory?start=${start}&end=${end}`)
      ).status(),
    ).toBe(403);
  } finally {
    await db`DELETE FROM app_user WHERE id=${id}`;
    await db.end();
  }
});
