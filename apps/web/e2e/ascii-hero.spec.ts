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
