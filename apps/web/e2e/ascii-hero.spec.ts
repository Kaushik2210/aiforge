import { expect, test } from "@playwright/test";

// The text-art views (quest map, skill tree, XP sparkline) only show in ASCII mode.
test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem("aiforge-ascii", "on"));
});

test("outside ASCII mode the text-art views are not shown", async ({ browser }) => {
  const context = await browser.newContext();
  const page = await context.newPage();
  for (const route of ["/map/", "/skills/"]) {
    await page.goto(route);
    await expect(page.locator("pre.ascii-map, pre.ascii-skills")).toBeHidden();
  }
  await context.close();
});

test("decorative rules and realm brackets are hidden or generated, and the realm names stay readable", async ({ page }) => {
  await page.goto("/");
  const rules = page.locator(".ascii-rule");
  expect(await rules.count()).toBeGreaterThanOrEqual(1); // above the quest map
  for (const rule of await rules.all()) await expect(rule).toHaveAttribute("aria-hidden", "true");
  await expect(page.getByRole("link", { name: /Realm 1: .*8 quests/ })).toBeVisible();
  await expect(page.getByRole("link", { name: /Realm 2: .*1 quest/ })).toBeVisible();
  const bracket = await page.locator(".realm-node").first().evaluate((el) => getComputedStyle(el, "::before").content);
  expect(bracket).toContain("[");
});

test("the quest map still fits at phone width with the new nodes and rules", async ({ page }) => {
  for (const width of [375, 640, 900]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/");
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow, `scrolls sideways at ${width}px`).toBeLessThanOrEqual(0);
  }
});

test("the map page also shows the quest map as a text path, hidden from assistive technology, with open realms starred", async ({ page }) => {
  await page.goto("/map/");
  const map = page.locator("pre.ascii-map");
  await expect(map).toHaveAttribute("aria-hidden", "true");
  await expect(map).toContainText("[*02]");
  await expect(map).toContainText("[*01]"); // Programming has six built quests
  await expect(map).toContainText("[ 03]");
  for (const width of [375, 768]) {
    await page.setViewportSize({ width, height: 900 });
    await page.reload();
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow, `scrolls sideways at ${width}px`).toBeLessThanOrEqual(0);
  }
});

test("the dashboard XP chart gets a one-line text sparkline that is hidden from assistive technology", async ({ page }) => {
  await page.goto("/dashboard/");
  const line = page.getByText(/^30d \[/);
  await expect(line).toHaveAttribute("aria-hidden", "true");
  await expect(line).toContainText("...");
});

test("the skills page also shows the tree as layered text, hidden from assistive technology, with built topics starred", async ({ page }) => {
  await page.goto("/skills/");
  const tree = page.locator("pre.ascii-skills");
  await expect(tree).toHaveAttribute("aria-hidden", "true");
  await expect(tree).toContainText("== layer 0");
  await expect(tree).toContainText("[*] Python basics");
  await expect(tree).toContainText("[ ] Linux and the command line");
  await expect(tree).toContainText("<= Python basics");
  for (const width of [375, 768]) {
    await page.setViewportSize({ width, height: 900 });
    await page.reload();
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow, `scrolls sideways at ${width}px`).toBeLessThanOrEqual(0);
  }
});
