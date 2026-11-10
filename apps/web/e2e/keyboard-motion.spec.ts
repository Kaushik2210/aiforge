import { expect, test } from "@playwright/test";

const ROUTES = ["/", "/dashboard/", "/map/", "/skills/", "/review/", "/settings/", "/quests/gradient-descent/", "/games/gradient-hiker/"];

test("the skip link is the first tab stop and moves focus to the main content", async ({ page }) => {
  await page.goto("/dashboard/");
  await page.keyboard.press("Tab");
  const skip = page.getByRole("link", { name: "Skip to main content" });
  await expect(skip).toBeFocused();
  await expect(skip).toBeVisible();
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/#main$/);
});

test("keyboard focus is always visible and never trapped on any page", async ({ page }) => {
  for (const route of ROUTES) {
    await page.goto(route);
    await page.waitForLoadState("networkidle");
    const seen = new Set<string>();
    for (let i = 0; i < 25; i++) {
      await page.keyboard.press("Tab");
      const info = await page.evaluate(() => {
        const el = document.activeElement as HTMLElement | null;
        if (!el || el === document.body) return null;
        const cs = getComputedStyle(el);
        const outlined = cs.outlineStyle !== "none" && parseFloat(cs.outlineWidth) > 0;
        const shadow = cs.boxShadow !== "none";
        return { id: `${el.tagName}:${el.textContent?.trim().slice(0, 30)}:${el.getAttribute("href") ?? ""}`, visible: outlined || shadow, tag: el.tagName };
      });
      if (!info) continue;
      // The Monaco editor draws its own caret and focus ring.
      if (info.tag === "TEXTAREA" || info.id.includes("monaco")) continue;
      expect(info.visible, `${route}: no visible focus on ${info.id}`).toBe(true);
      seen.add(info.id);
    }
    expect(seen.size, `${route}: tabbing should reach several controls`).toBeGreaterThan(3);
  }
});

test("reduced motion stops infinite animations on every page", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  for (const route of ROUTES) {
    await page.goto(route);
    await page.waitForLoadState("networkidle");
    const running = await page.evaluate(() =>
      document
        .getAnimations()
        .filter((a) => {
          const t = a.effect?.getComputedTiming();
          return t && t.iterations === Infinity && (t.duration as number) > 1 && a.playState === "running";
        })
        .map((a) => (a.effect as KeyframeEffect).target?.className?.toString().slice(0, 40)),
    );
    expect(running, route).toEqual([]);
  }
});

test("Focus mode removes decorative motion and survives a reload", async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem("aiforge-focus", "on"));
  await page.goto("/");
  await expect(page.locator("html")).toHaveAttribute("data-focus", "on");
  const running = await page.evaluate(() =>
    document.getAnimations().filter((a) => a.effect?.getComputedTiming().iterations === Infinity && a.playState === "running").length,
  );
  expect(running).toBe(0);
  await expect(page.locator(".petals")).toBeHidden();
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-focus", "on");
});
