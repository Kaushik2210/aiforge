import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

const ROUTES = ["/", "/dashboard/", "/map/", "/skills/", "/review/", "/settings/", "/quests/gradient-descent/", "/quests/python-basics/", "/quests/python-functions-and-modules/", "/games/gradient-hiker/"];
const THEMES = ["light", "dark"] as const;

for (const theme of THEMES) {
  for (const route of ROUTES) {
    test(`axe: ${route} in ${theme} theme has no WCAG A/AA violations`, async ({ page }) => {
      await page.emulateMedia({ colorScheme: theme });
      await page.goto(route);
      await page.waitForLoadState("networkidle");
      const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"]).analyze();
      const summary = results.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).slice(0, 3).join(" | ")}`);
      expect(summary).toEqual([]);
    });
  }
}

test("every page has one h1, a main landmark and a skip link", async ({ page }) => {
  for (const route of ROUTES) {
    await page.goto(route);
    await expect(page.locator("h1"), route).toHaveCount(1);
    await expect(page.locator("main"), route).toHaveCount(1);
    await expect(page.locator("a[href^='#']").first(), route).toBeAttached();
  }
});
