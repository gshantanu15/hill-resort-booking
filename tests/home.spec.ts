import { test, expect } from "@playwright/test";
test("normal motion leaves the closing heading sharp and disclosures reversible", async ({
  page,
}, testInfo) => {
  await page.goto("/");
  const details = page.locator("#estate-room details");
  await details.locator("summary").click();
  await expect(
    details.getByText("Writing desk", { exact: true }),
  ).toBeVisible();
  await details.locator("summary").click();
  await expect(details.getByText("Writing desk", { exact: true })).toBeHidden();
  const about = page.locator("#about");
  await about.scrollIntoViewIfNeeded();
  await page.evaluate(() => {
    const section = document.querySelector("#about");
    if (!section) throw new Error("about section missing");
    window.scrollTo({
      top:
        window.scrollY +
        section.getBoundingClientRect().top -
        innerHeight +
        120,
      behavior: "instant",
    });
  });
  await expect
    .poll(() =>
      page.locator(".av-estate .estate-heading").evaluate((el) => {
        const value = getComputedStyle(el).filter;
        return Number.parseFloat(value.replace("blur(", "")) || 0;
      }),
    )
    .toBeGreaterThan(0);
  await page.screenshot({ path: testInfo.outputPath("closing-misty.png") });
  await page.evaluate(() => {
    const section = document.querySelector("#about");
    if (!section) throw new Error("about section missing");
    window.scrollTo({
      top: window.scrollY + section.getBoundingClientRect().top - 88,
      behavior: "instant",
    });
  });
  await expect
    .poll(() =>
      page
        .locator(".av-estate .estate-heading")
        .evaluate((el) => getComputedStyle(el).filter),
    )
    .toMatch(/^(none|blur\(0px\))$/);
  await page.screenshot({ path: testInfo.outputPath("closing-sharp.png") });
});

test("guest navigation and page photography stay distinct", async ({
  page,
}, testInfo) => {
  await page.goto("/");
  await expect(page.locator(".guest-footer-photo")).toHaveAttribute(
    "src",
    /green-hills-road/,
  );
  const mobile = testInfo.project.name === "mobile";
  if (mobile)
    await page.getByRole("button", { name: "Open navigation" }).click();
  const navigation = mobile
    ? page.getByRole("dialog")
    : page.getByRole("navigation", { name: "Main navigation" });
  await navigation
    .getByRole("link", { name: "Enquiries", exact: true })
    .click();
  await expect(page).toHaveURL(/\/enquire$/);
  await expect(page.locator(".enquiry-photo img")).toHaveAttribute(
    "src",
    /shade-coffee/,
  );
  if (mobile) {
    await page.getByRole("button", { name: "Open navigation" }).click();
    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog")).toBeHidden();
  }
});
test("footer staff link keeps its complete border at rest and on hover", async ({
  page,
}, testInfo) => {
  await page.goto("/");
  const link = page.getByRole("link", { name: "Staff sign in", exact: true });
  await link.scrollIntoViewIfNeeded();
  const readBorder = () =>
    link.evaluate((el) => {
      const css = getComputedStyle(el);
      return {
        colors: [
          css.borderTopColor,
          css.borderRightColor,
          css.borderBottomColor,
          css.borderLeftColor,
        ],
        widths: [
          css.borderTopWidth,
          css.borderRightWidth,
          css.borderBottomWidth,
          css.borderLeftWidth,
        ],
      };
    });
  const idle = await readBorder();
  expect(new Set(idle.colors).size).toBe(1);
  expect(idle.colors[0]).not.toBe("rgba(0, 0, 0, 0)");
  expect(idle.widths).toEqual(["1px", "1px", "1px", "1px"]);
  await link.screenshot({ path: testInfo.outputPath("staff-idle.png") });
  await link.hover();
  expect(await readBorder()).toEqual(idle);
  await link.screenshot({ path: testInfo.outputPath("staff-hover.png") });
});
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
  const gallery = page.locator(
    '#estate-room .guest-gallery-image[data-active="true"]',
  );
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
  for (const image of await page
    .locator('.guest-gallery-image[data-active="true"]')
    .all()) {
    await image.scrollIntoViewIfNeeded();
    await expect(image).toHaveJSProperty("complete", true);
    await expect(image).not.toHaveJSProperty("naturalWidth", 0);
  }
  await page.getByRole("heading", { level: 1 }).scrollIntoViewIfNeeded();
  await page.screenshot({
    path: testInfo.outputPath("catalogue.png"),
    fullPage: true,
  });
});

test("gallery keeps the current photo during loading and honours the latest choice", async ({
  page,
}) => {
  let releasePhoto!: () => void;
  const heldPhoto = new Promise<void>((resolve) => {
    releasePhoto = resolve;
  });
  await page.route("**/_next/image?**", async (route) => {
    const url = new URL(route.request().url());
    if (
      url.searchParams.get("url")?.includes("reading-corner") &&
      Number(url.searchParams.get("w")) > 256
    ) {
      await heldPhoto;
    }
    await route.continue();
  });
  await page.goto("/");
  const room = page.locator("#estate-room");
  const main = room.locator(".guest-gallery-main");
  await main.scrollIntoViewIfNeeded();
  const initial = main.locator('[data-active="true"]');
  await expect(initial).toHaveJSProperty("complete", true);
  const initialSrc = await initial.getAttribute("src");
  await room
    .getByRole("button", { name: "View Estate room image 2", exact: true })
    .click();
  await expect(main).toHaveAttribute("aria-busy", "true");
  await expect(main.locator('[data-active="true"]')).toHaveAttribute(
    "src",
    initialSrc!,
  );
  await room
    .getByRole("button", { name: "View Estate room image 3", exact: true })
    .click();
  releasePhoto();
  await expect(
    room.getByRole("button", { name: "View Estate room image 3", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await expect(main).toHaveAttribute("aria-busy", "false");
  await expect(main.locator('[data-active="true"]')).toHaveAttribute(
    "alt",
    /bathroom/i,
  );
});

test("quiet continuity supports keyboard disclosures and reduced motion", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  const room = page.locator("#estate-room");
  const summary = room.locator("summary");
  await summary.focus();
  await summary.press("Enter");
  await expect(room.locator("details")).toHaveAttribute("open", "");
  await expect(room.getByText("Writing desk", { exact: true })).toBeVisible();
  await summary.press("Enter");
  await expect(room.locator("details")).not.toHaveAttribute("open", "");
  const durations = await room
    .locator(".guest-gallery-image")
    .first()
    .evaluate((el) => getComputedStyle(el).transitionDuration);
  expect(
    durations.split(",").every((value) => Number.parseFloat(value) === 0),
  ).toBe(true);
  await page.goto("/#about");
  const heading = page.locator(".av-estate .estate-heading");
  expect(await heading.evaluate((el) => getComputedStyle(el).filter)).toBe(
    "none",
  );
  expect(
    await heading.evaluate((el) => getComputedStyle(el).animationName),
  ).toBe("none");
});

test("a failed gallery photo preserves the displayed image and offers recovery", async ({
  page,
}) => {
  await page.route("**/_next/image?**", async (route) => {
    const url = new URL(route.request().url());
    if (
      url.searchParams.get("url")?.includes("reading-corner") &&
      Number(url.searchParams.get("w")) > 256
    ) {
      await route.abort();
    } else {
      await route.continue();
    }
  });
  await page.goto("/");
  const room = page.locator("#estate-room");
  await room
    .getByRole("button", { name: "View Estate room image 2", exact: true })
    .click();
  await expect(room.getByRole("status")).toContainText("couldn’t load");
  await expect(
    room.getByRole("button", { name: "View Estate room image 1", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await expect(room.locator(".guest-gallery-main")).toHaveAttribute(
    "aria-busy",
    "false",
  );
  await room
    .getByRole("button", { name: "View Estate room image 3", exact: true })
    .click();
  await expect(
    room.getByRole("button", { name: "View Estate room image 3", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await expect(room.getByRole("status")).toHaveCount(0);
});
