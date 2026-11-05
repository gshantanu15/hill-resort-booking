import { expect, test } from "@playwright/test";

const sizes = [
  { width: 1366, height: 768 },
  { width: 1920, height: 1080 },
  { width: 1280, height: 480 },
  // Effective CSS viewport of a 1920x1080 browser at 200% zoom.
  { width: 960, height: 540 },
  { width: 390, height: 664 },
];

for (const size of sizes) {
  test(`date picker stays usable at ${size.width}x${size.height}`, async ({
    page,
  }) => {
    await page.setViewportSize(size);
    await page.goto("/book");
    const trigger = page.getByRole("button", {
      name: "Choose check-in and check-out dates",
    });
    const dialog = page.getByRole("dialog", { name: "Choose your dates" });
    const open = async () => {
      await trigger.click();
      await expect(dialog).toBeVisible();
    };
    await open();
    await dialog.getByRole("button", { name: "Next month" }).click();
    await dialog.getByRole("button", { name: "Previous month" }).click();
    await dialog.getByText("Enter dates instead", { exact: true }).click();
    await dialog.getByRole("button", { name: "Apply dates" }).click();
    await expect(dialog.getByRole("alert")).toBeVisible();
    await dialog.getByLabel("Check-in", { exact: true }).fill("2026-11-10");
    await dialog.getByLabel("Check-out", { exact: true }).fill("2026-11-12");
    const apply = dialog.getByRole("button", { name: "Apply dates" });
    await apply.scrollIntoViewIfNeeded();
    await expect(apply).toBeInViewport();
    const surface = page.locator(
      ".guest-date-picker__popover, .guest-date-picker__modal",
    );
    const box = await surface.boundingBox();
    expect(box!.y).toBeGreaterThanOrEqual(0);
    expect(box!.y + box!.height).toBeLessThanOrEqual(size.height);
    await apply.click();
    await expect(dialog).toBeHidden();
    await expect(trigger).toBeFocused();
    await expect(trigger).toContainText("10 Nov 2026");
    await expect(trigger).toContainText("12 Nov 2026");

    await open();
    await dialog.getByLabel("Check-out", { exact: true }).fill("2026-11-13");
    await dialog.getByRole("button", { name: "Cancel", exact: true }).click();
    await expect(trigger).toContainText("12 Nov 2026");
    for (const dismiss of ["escape", "close", "outside"]) {
      await open();
      if (dismiss === "escape") await page.keyboard.press("Escape");
      else if (dismiss === "close")
        await dialog.getByRole("button", { name: "Close date picker" }).click();
      else await page.mouse.click(size.width - 2, size.height - 2);
      await expect(dialog).toBeHidden();
      await expect(trigger).toBeFocused();
      const before = await page.evaluate(() => window.scrollY);
      await page.mouse.move(size.width / 2, size.height / 2);
      await page.mouse.wheel(0, 400);
      await expect
        .poll(() => page.evaluate(() => window.scrollY))
        .toBeGreaterThan(before);
      await trigger.scrollIntoViewIfNeeded();
    }
  });
}
