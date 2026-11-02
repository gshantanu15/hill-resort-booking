import { test, expect } from "@playwright/test";
test("room catalogue is readable and navigable", async ({ page }, testInfo) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toContainText(
    "Leave the hurry",
  );
  await page.getByRole("link", { name: "Explore rooms & villas" }).click();
  await expect(
    page.getByRole("heading", { name: "Estate villa", exact: true }),
  ).toBeVisible();
  await expect(page.locator("article")).toHaveCount(3);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await page.goto("/");
  await page.screenshot({
    path: testInfo.outputPath("catalogue.png"),
    fullPage: true,
  });
});
