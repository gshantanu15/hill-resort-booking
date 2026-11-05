import { test, expect } from "@playwright/test";
test("room catalogue is readable and navigable", async ({ page }, testInfo) => {
  if (testInfo.project.name === "mobile") {
    const session = await page.context().newCDPSession(page);
    await session.send("Network.enable");
    await session.send("Network.emulateNetworkConditions", {
      offline: false,
      latency: 150,
      downloadThroughput: 200 * 1024,
      uploadThroughput: 64 * 1024,
    });
  }
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toContainText(
    "Leave the hurry",
  );
  await page.getByRole("link", { name: "Explore rooms & villas" }).click();
  await expect(
    page.getByRole("heading", { name: "Estate villa", exact: true }),
  ).toBeVisible();
  await expect(page.locator("article")).toHaveCount(3);
  for (const disclosure of await page
    .locator(".room-description summary")
    .all()) {
    await disclosure.click();
  }
  await expect(page.getByText("En-suite bathroom").first()).toBeVisible();
  await expect(
    page.getByText("Private sit-out", { exact: true }).first(),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Choose this stay" }),
  ).toHaveCount(3);
  await expect(
    page.getByRole("link", { name: "Staff sign in", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Staff sign in", exact: true }),
  ).toHaveAttribute("href", "/staff/login");
  await expect(
    page.getByText("indicative / night · exact price depends on dates", {
      exact: true,
    }),
  ).toHaveCount(3);
  const choices = await page
    .locator(".guest-gallery-button img")
    .evaluateAll((images) => images.map((image) => image.getAttribute("src")));
  expect(choices).toHaveLength(7);
  expect(new Set(choices).size).toBe(7);
  await expect(
    page.locator(".guest-gallery-button span,.gallery-caption"),
  ).toHaveCount(0);
  const gallery = page.locator(".guest-gallery-main img").first();
  const before = await gallery.getAttribute("src");
  await page
    .getByRole("button", { name: "View Estate room image 2", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "View Estate room image 2", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  expect(await gallery.getAttribute("src")).not.toBe(before);
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
