import { test, expect } from "@playwright/test";

test("demo credentials fill without signing in automatically", async ({
  page,
}) => {
  let submissions = 0;
  await page.route("**/api/auth/sign-in/email", async (route) => {
    submissions++;
    await route.fulfill({
      status: 401,
      json: { error: "Synthetic rejection" },
    });
  });
  await page.goto("/staff/login");
  await page.getByRole("button", { name: "Fill demo credentials" }).click();
  await expect(page.getByLabel("Email", { exact: true })).toHaveValue(
    "staff@aavana.example",
  );
  await expect(page.getByLabel("Password", { exact: true })).toHaveValue(
    "EstateDemo!2026",
  );
  await expect(
    page.getByRole("button", { name: "Sign in", exact: true }),
  ).toBeFocused();
  expect(submissions).toBe(0);
  await page.keyboard.press("Enter");
  await expect(page.locator(".staff-error")).toContainText("Sign-in failed");
  expect(submissions).toBe(1);
  await page.getByRole("button", { name: "Fill demo credentials" }).click();
  await expect(page.locator(".staff-error")).toHaveCount(0);
  await expect(page).toHaveURL(/\/staff\/login$/);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});
