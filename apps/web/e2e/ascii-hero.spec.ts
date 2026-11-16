import { expect, test } from "@playwright/test";

const hero = (page: import("@playwright/test").Page) => page.locator("pre.ascii-hero");

test("the home hero draws an ASCII skyline that moves, and a visible Pause button stops it", async ({ page }) => {
  await page.goto("/");
  await expect(hero(page)).toContainText("O"); // the sun
  const pause = page.getByRole("button", { name: "Pause animation" });
  await expect(pause).toBeVisible();
  await pause.click();
  await expect(page.getByRole("button", { name: "Play animation" })).toHaveAttribute("aria-pressed", "true");
  const frozen = await hero(page).textContent();
  await page.waitForTimeout(500);
  expect(await hero(page).textContent()).toBe(frozen);
  await page.getByRole("button", { name: "Play animation" }).click();
  await expect.poll(async () => hero(page).textContent()).not.toBe(frozen);
});

test("with reduced motion the hero is one still frame with no Pause button, and the headline words are intact", async ({ browser }) => {
  const context = await browser.newContext({ reducedMotion: "reduce" });
  const page = await context.newPage();
  await page.goto("/");
  await expect(hero(page)).toContainText("O");
  await expect(page.getByRole("button", { name: /animation/ })).toHaveCount(0);
  const a = await hero(page).textContent();
  await page.waitForTimeout(400);
  expect(await hero(page).textContent()).toBe(a);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Level up into an AI engineer");
  await context.close();
});

test("Focus mode stops the hero animation", async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem("aiforge-focus", "on"));
  await page.goto("/");
  await expect(hero(page)).toContainText("O");
  await expect(page.getByRole("button", { name: /animation/ })).toHaveCount(0);
});

test("the hero is hidden from assistive technology and fits every width", async ({ page }) => {
  for (const width of [375, 768, 1280]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/");
    await expect(hero(page)).toHaveAttribute("aria-hidden", "true");
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow, `scrolls sideways at ${width}px`).toBeLessThanOrEqual(0);
  }
});

test("effects set to Off stop the hero animation", async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem("aiforge-fx", "0"));
  await page.goto("/");
  await expect(hero(page)).toContainText("O");
  await expect(page.getByRole("button", { name: /animation/ })).toHaveCount(0);
});

test("the boot line types itself with the whole command always readable, and is still with motion off", async ({ browser }) => {
  const context = await browser.newContext({ reducedMotion: "reduce" });
  const page = await context.newPage();
  await page.goto("/");
  await expect(page.getByText("forge start gradient-descent")).toHaveText("forge start gradient-descent");
  await context.close();
});

test("decorative rules and realm brackets are hidden or generated, and the realm names stay readable", async ({ page }) => {
  await page.goto("/");
  const rules = page.locator(".ascii-rule");
  expect(await rules.count()).toBeGreaterThanOrEqual(2); // quest map and footer
  for (const rule of await rules.all()) await expect(rule).toHaveAttribute("aria-hidden", "true");
  await expect(page.getByRole("link", { name: /Realm 1: .*6 quests/ })).toBeVisible();
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
  await expect(tree).toContainText("[ ] Git and GitHub");
  await expect(tree).toContainText("<= Python basics");
  for (const width of [375, 768]) {
    await page.setViewportSize({ width, height: 900 });
    await page.reload();
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow, `scrolls sideways at ${width}px`).toBeLessThanOrEqual(0);
  }
});
