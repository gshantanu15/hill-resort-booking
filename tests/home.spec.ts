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
  for (const image of await page.locator("img").all()) {
    await image.scrollIntoViewIfNeeded();
    await expect(image).toHaveJSProperty("complete", true);
    await expect(image).not.toHaveJSProperty("naturalWidth", 0);
  }
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
