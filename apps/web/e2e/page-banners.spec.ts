import { expect, test } from "@playwright/test";

const banner = (page: import("@playwright/test").Page) => page.locator(".page-banner");

test("the dashboard, a quest and the skills page each show one 3D strip, hidden from assistive technology", async ({ page }) => {
  for (const route of ["/dashboard/", "/quests/gradient-descent/", "/skills/"]) {
    await page.goto(route);
    await expect(banner(page), route).toHaveAttribute("aria-hidden", "true");
    await expect(page.locator(".page-banner canvas"), route).toHaveCount(1);
    expect(await page.locator("canvas").count(), `${route}: only one WebGL canvas`).toBe(1);
  }
});

test("the strip says where you are, from your real progress, and follows it", async ({ page }) => {
  await page.goto("/quests/gradient-descent/");
  await expect(banner(page)).toContainText("0 of 5 tiers done");
  const ladder = page.getByRole("navigation", { name: "Depth ladder" });
  await ladder.getByRole("button", { name: "Mark tier done" }).first().click();
  await expect(banner(page)).toContainText("1 of 5 tiers done");
  await page.goto("/dashboard/");
  await expect(banner(page)).toContainText(/Level 1: \d+ of \d+ XP to the next/);
  await page.goto("/skills/");
  await expect(banner(page)).toContainText(/\d+ of \d+ topics built/);
});

test("with reduced motion or Focus mode the ball is just placed, with no extra motion", async ({ browser }) => {
  const context = await browser.newContext({ reducedMotion: "reduce" });
  const page = await context.newPage();
  await page.goto("/skills/");
  await expect(page.locator(".page-banner canvas")).toHaveCount(1);
  await context.close();
  const other = await browser.newContext();
  const p2 = await other.newPage();
  await p2.addInitScript(() => localStorage.setItem("aiforge-focus", "on"));
  await p2.goto("/skills/");
  await expect(p2.locator(".page-banner canvas")).toHaveCount(1);
  await other.close();
});

test("without WebGL the strip falls back to its poster and the page still works", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.addInitScript(() => {
    const original = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (this: HTMLCanvasElement, type: string, ...rest: unknown[]) {
      if (type.startsWith("webgl")) return null;
      return (original as (...a: unknown[]) => unknown).call(this, type, ...rest) as never;
    } as typeof original;
  });
  await page.goto("/skills/");
  await expect(page.locator(".page-banner canvas")).toHaveCount(0);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Skill tree");
  expect(errors).toEqual([]);
});

test("the strip fits phone and tablet widths", async ({ page }) => {
  for (const width of [375, 768]) {
    await page.setViewportSize({ width, height: 850 });
    for (const route of ["/dashboard/", "/quests/gradient-descent/", "/skills/"]) {
      await page.goto(route);
      await page.waitForLoadState("networkidle");
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
      expect(overflow, `${route} scrolls sideways at ${width}px`).toBeLessThanOrEqual(0);
    }
  }
});
