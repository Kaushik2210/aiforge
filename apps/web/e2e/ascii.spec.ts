import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

const toggle = (page: import("@playwright/test").Page) => page.getByRole("button", { name: /^ASCII mode:/ });

test("ASCII mode is off by default and the toggle turns it on, saves it and survives a reload", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("html")).not.toHaveAttribute("data-ascii", "on");
  await expect(toggle(page)).toHaveAttribute("aria-pressed", "false");
  await toggle(page).click();
  await expect(page.locator("html")).toHaveAttribute("data-ascii", "on");
  await expect(toggle(page)).toHaveAttribute("aria-pressed", "true");
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-ascii", "on");
  await expect(toggle(page)).toHaveAttribute("aria-pressed", "true");
  await toggle(page).click();
  await expect(page.locator("html")).not.toHaveAttribute("data-ascii", "on");
});

test("ASCII mode switches to the monospace font and adds terminal prefixes without changing the words", async ({ page }) => {
  await page.goto("/settings/");
  const before = await page.locator("h1").innerText();
  const fontBefore = await page.locator("body").evaluate((el) => getComputedStyle(el).fontFamily);
  await toggle(page).click();
  const fontAfter = await page.locator("body").evaluate((el) => getComputedStyle(el).fontFamily);
  expect(fontAfter).not.toBe(fontBefore);
  expect(fontAfter.toLowerCase()).toContain("jetbrains mono");
  expect(await page.locator("h1").innerText()).toBe(before); // the words are unchanged
  const prefix = await page.locator("h1").evaluate((el) => getComputedStyle(el, "::before").content);
  expect(prefix).toContain("> ");
  const bracket = await toggle(page).evaluate((el) => getComputedStyle(el, "::before").content);
  expect(bracket).toContain("[");
});

test("the XP bar becomes a text bar with real progress and stays a real progress bar with the same name and values", async ({ page }) => {
  await page.goto("/quests/gradient-descent/");
  const ladder = page.getByRole("navigation", { name: "Depth ladder" });
  await ladder.getByRole("button", { name: "Mark tier done" }).first().click();
  await expect(ladder.getByText("Done").first()).toBeVisible();
  const bar = page.getByRole("progressbar", { name: "XP to next level" }).first();
  await expect.poll(async () => Number(await bar.getAttribute("aria-valuenow"))).toBeGreaterThan(0);
  const normal = {
    now: await bar.getAttribute("aria-valuenow"),
    max: await bar.getAttribute("aria-valuemax"),
  };
  await toggle(page).click();
  const ascii = page.getByRole("progressbar", { name: "XP to next level" }).first();
  await expect(ascii).toBeVisible();
  await expect(ascii).toContainText(/\[#+-*\]/); // at least one filled cell now that there is XP
  expect({ now: await ascii.getAttribute("aria-valuenow"), max: await ascii.getAttribute("aria-valuemax") }).toEqual(normal);
  // the characters are decoration: every child is hidden from assistive technology
  const allHidden = await ascii.evaluate((el) => [...el.children].length > 0 && [...el.children].every((c) => c.getAttribute("aria-hidden") === "true"));
  expect(allHidden).toBe(true);
});

test("a saved ASCII mode loads with no console or hydration errors and keeps the attribute", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => {
    if (m.type() === "error" && !m.text().startsWith("Failed to load resource")) errors.push(m.text());
  });
  await page.addInitScript(() => localStorage.setItem("aiforge-ascii", "on"));
  for (const route of ["/", "/dashboard/", "/quests/gradient-descent/"]) {
    await page.goto(route);
    await page.waitForLoadState("networkidle");
    await expect(page.locator("html")).toHaveAttribute("data-ascii", "on");
  }
  expect(errors).toEqual([]);
});

test("no page scrolls sideways at phone, tablet and laptop widths, in ASCII mode or not", async ({ page }) => {
  test.setTimeout(240_000); // 48 page loads
  for (const ascii of [true, false]) {
    if (ascii) await page.addInitScript(() => localStorage.setItem("aiforge-ascii", "on"));
    for (const width of [375, 640, 768, 820, 1024, 1280]) {
      await page.setViewportSize({ width, height: 900 });
      for (const route of ["/", "/dashboard/", "/settings/", "/quests/gradient-descent/"]) {
        await page.goto(route);
        await page.waitForLoadState("networkidle");
        const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
        expect(overflow, `${route} at ${width}px (ASCII ${ascii}) scrolls sideways by ${overflow}px`).toBeLessThanOrEqual(0);
      }
    }
  }
});

test("header buttons keep their brackets and label on one line in ASCII mode", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.addInitScript(() => localStorage.setItem("aiforge-ascii", "on"));
  await page.goto("/settings/");
  for (const button of await page.locator("header button").all()) {
    const info = await button.evaluate((el) => {
      const range = document.createRange();
      range.selectNodeContents(el);
      const tops = new Set([...range.getClientRects()].map((r) => Math.round(r.top)));
      return { lines: tops.size, whiteSpace: getComputedStyle(el).whiteSpace };
    });
    expect(info.whiteSpace).toBe("nowrap"); // the brackets are generated text, so the rule is what keeps them with the label
    expect(info.lines).toBe(1);
  }
});

test("interactive controls keep their 44 px minimum size in ASCII mode", async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem("aiforge-ascii", "on"));
  await page.goto("/settings/");
  for (const button of await page.locator("header button").all()) {
    const box = await button.boundingBox();
    expect(box!.height).toBeGreaterThanOrEqual(43.5);
  }
});

for (const scheme of ["light", "dark"] as const) {
  test.describe(`axe in ASCII mode (${scheme} theme)`, () => {
    test.use({ colorScheme: scheme });
    for (const route of ["/", "/dashboard/", "/map/", "/skills/", "/settings/", "/quests/gradient-descent/", "/fx-lab/"]) {
      test(`${route} has no WCAG A/AA violations`, async ({ browser }) => {
        const context = await browser.newContext({ colorScheme: scheme });
        const page = await context.newPage();
        await page.addInitScript(() => localStorage.setItem("aiforge-ascii", "on"));
        await page.goto(route);
        await page.waitForLoadState("networkidle");
        await expect(page.locator("html")).toHaveAttribute("data-ascii", "on");
        const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"]).analyze();
        const summary = results.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).slice(0, 3).join(" | ")}`);
        expect(summary).toEqual([]);
        await context.close();
      });
    }
  });
}
