import { expect, test } from "@playwright/test";

const scene = (page: import("@playwright/test").Page) => page.locator(".loss-scene canvas");
const readout = (page: import("@playwright/test").Page) => page.locator(".hero-hud p.font-mono");

test("the home hero draws one 3D canvas, hidden from assistive technology, with the real headline", async ({ page }) => {
  await page.goto("/");
  await expect(scene(page)).toHaveCount(1);
  await expect(page.locator(".loss-scene")).toHaveAttribute("aria-hidden", "true");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Level up into an AI engineer");
  expect(await page.locator("canvas").count()).toBe(1); // never more than one WebGL context on the page
});

test("scrolling the hero runs the descent: the step counter climbs and the beats change", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto("/");
  await expect(readout(page)).toContainText("step 0 of 90");
  const hero = page.locator("section.hero-tall");
  const height = await hero.evaluate((el) => el.getBoundingClientRect().height);
  await page.evaluate((y) => window.scrollTo(0, y), Math.round(height * 0.45));
  await expect.poll(async () => Number((/step (\d+)/.exec((await readout(page).textContent()) ?? "") ?? [])[1] ?? 0)).toBeGreaterThan(10);
  await page.evaluate((y) => window.scrollTo(0, y), Math.round(height));
  await expect.poll(async () => Number((/step (\d+)/.exec((await readout(page).textContent()) ?? "") ?? [])[1] ?? 0)).toBeGreaterThan(80);
  await expect(page.getByText("Settle in a valley. That is training.")).toHaveCSS("opacity", "1");
});

test("with reduced motion the hero is one still picture of the finished run and the page does not scroll-jack", async ({ browser }) => {
  const context = await browser.newContext({ reducedMotion: "reduce" });
  const page = await context.newPage();
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto("/");
  await expect(page.locator("section.hero-tall")).toHaveAttribute("data-mode", "still");
  await expect(readout(page)).toContainText("step 90 of 90");
  const height = await page.locator("section.hero-tall").evaluate((el) => el.getBoundingClientRect().height);
  expect(height).toBeLessThan(1000); // one screen, not a tall scroll track
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Level up into an AI engineer");
  await context.close();
});

test("Focus mode and effects Off also give the still picture", async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem("aiforge-focus", "on"));
  await page.goto("/");
  await expect(page.locator("section.hero-tall")).toHaveAttribute("data-mode", "still");
  await expect(readout(page)).toContainText("step 90 of 90");

  const other = await page.context().newPage();
  await other.addInitScript(() => localStorage.setItem("aiforge-fx", "0"));
  await other.goto("/");
  await expect(other.locator("section.hero-tall")).toHaveAttribute("data-mode", "still");
});

test("if WebGL is unavailable the page falls back to the still poster and nothing breaks", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.addInitScript(() => {
    const original = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (this: HTMLCanvasElement, type: string, ...rest: unknown[]) {
      if (type.startsWith("webgl")) return null;
      return (original as (...a: unknown[]) => unknown).call(this, type, ...rest) as never;
    } as typeof original;
  });
  await page.goto("/");
  await expect(page.locator("section.hero-tall")).toHaveAttribute("data-mode", "still");
  await expect(scene(page)).toHaveCount(0);
  await expect(page.getByRole("link", { name: "Begin Quest 1" }).first()).toBeVisible();
  expect(errors).toEqual([]);
});

test("the old mascot, scrambling text and typed lines are gone", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("svg[aria-label*='Mira'], .caret, pre.ascii-hero")).toHaveCount(0);
  await expect(page.getByText(/^\$ forge/)).toHaveCount(0);
  await page.goto("/dashboard/");
  await expect(page.getByText(/^\$ open/)).toHaveCount(0);
});

test("the home page fits phone, tablet and laptop widths", async ({ page }) => {
  for (const width of [375, 768, 1280]) {
    await page.setViewportSize({ width, height: 850 });
    await page.goto("/");
    await page.waitForLoadState("networkidle");
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow, `scrolls sideways at ${width}px`).toBeLessThanOrEqual(0);
  }
});
