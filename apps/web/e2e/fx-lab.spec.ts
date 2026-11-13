import { expect, test, type Page } from "@playwright/test";

/** Total brightness of the lab canvas, sampled, so "darker" and "changed" can be measured on real pixels. */
const MEASURE = `
  (() => {
    const c = document.querySelector("canvas");
    const d = c.getContext("2d").getImageData(0, 0, c.width, c.height).data;
    let s = 0;
    for (let i = 0; i < d.length; i += 16) s += d[i] + d[i + 1] + d[i + 2];
    return s;
  })()
`;

const brightness = (page: Page): Promise<number> => page.evaluate(MEASURE) as Promise<number>;

/** Press a button, then watch the canvas for `ms` and return the base, lowest and highest brightness seen. */
async function watch(page: Page, label: string, ms = 700) {
  return page.evaluate(
    async ({ label, ms, measure }) => {
      const m = () => eval(measure) as number;
      const base = m();
      const button = [...document.querySelectorAll("button")].find((b) => b.textContent?.trim() === label) as HTMLButtonElement;
      button.click();
      let min = base;
      let max = base;
      let changedFrames = 0;
      const t0 = performance.now();
      while (performance.now() - t0 < ms) {
        await new Promise((r) => requestAnimationFrame(r));
        const v = m();
        min = Math.min(min, v);
        max = Math.max(max, v);
        // A redraw can differ from the first draw by a rounding step or two, so count real changes only.
        if (Math.abs(v - base) / base > 0.002) changedFrames++;
      }
      return { base, min, max, changedFrames };
    },
    { label, ms, measure: MEASURE },
  );
}

test("the lab lists every effect and announces what was played", async ({ page }) => {
  await page.goto("/fx-lab/");
  await expect(page.getByRole("heading", { level: 1, name: "Effects lab" })).toBeVisible();
  for (const name of ["Hit stop", "Screen shake", "Zoom punch", "Speed lines", "Focus lines", "Shockwave", "Smear and afterimages", "Impact frame", "Boss defeated combo", "Level-up banner"]) {
    await expect(page.getByRole("button", { name, exact: true })).toBeVisible();
  }
  await page.getByRole("button", { name: "Shockwave", exact: true }).click();
  await expect(page.getByRole("status")).toContainText("Played: Shockwave.");
});

test("a shockwave really changes the picture and then the scene settles back exactly", async ({ page }) => {
  await page.goto("/fx-lab/");
  await page.waitForTimeout(300);
  const result = await watch(page, "Shockwave", 1200);
  expect(result.changedFrames).toBeGreaterThan(5);
  await expect(page.locator("canvas")).toHaveAttribute("data-active", "false", { timeout: 4000 });
  await expect.poll(async () => Math.abs((await brightness(page)) - result.base) / result.base).toBeLessThan(0.002);
});

test("the impact frame darkens the whole picture for a moment at Normal", async ({ page }) => {
  await page.goto("/fx-lab/");
  await page.waitForTimeout(300);
  const r = await watch(page, "Impact frame", 600);
  expect(r.min).toBeLessThan(r.base * 0.6);
  // and it never brightens the scene past where it started
  expect(r.max).toBeLessThanOrEqual(r.base * 1.002);
});

test("the smear and afterimages move the hiker and leave the scene clean afterwards", async ({ page }) => {
  await page.goto("/fx-lab/");
  await page.waitForTimeout(300);
  const r = await watch(page, "Smear and afterimages", 2200);
  expect(r.changedFrames).toBeGreaterThan(20);
  await expect(page.locator("canvas")).toHaveAttribute("data-active", "false", { timeout: 4000 });
  await expect.poll(async () => Math.abs((await brightness(page)) - r.base) / r.base).toBeLessThan(0.002);
});

test.describe("when effects are Off", () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem("aiforge-fx", "0"));
  });

  test("loads with no hydration or console errors and keeps data-fx on the page", async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));
    page.on("console", (m) => {
      // The static test server answers Next's optional prefetch files with 404; those are not page errors.
      if (m.type() === "error" && !m.text().startsWith("Failed to load resource")) errors.push(m.text());
    });
    await page.goto("/fx-lab/");
    await page.waitForLoadState("networkidle");
    await expect(page.locator("html")).toHaveAttribute("data-fx", "0");
    expect(errors).toEqual([]);
  });

  test("buttons play nothing, the page says why, and the banner is skipped", async ({ page }) => {
    await page.goto("/fx-lab/");
    await expect(page.getByRole("note")).toContainText("Effects are off");
    const r = await watch(page, "Impact frame", 500);
    expect(r.changedFrames).toBe(0);
    const w = await watch(page, "Boss defeated combo", 500);
    expect(w.changedFrames).toBe(0);
    await page.getByRole("button", { name: "Level-up banner" }).click();
    await expect(page.getByRole("status")).toContainText("Banners are off");
    await expect(page.locator(".cutin")).toHaveCount(0);
  });
});

test.describe("when effects are Low", () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem("aiforge-fx", "1"));
  });

  test("the impact frame is refused and says so, while other effects still play", async ({ page }) => {
    await page.goto("/fx-lab/");
    const r = await watch(page, "Impact frame", 500);
    expect(r.changedFrames).toBe(0);
    await expect(page.getByRole("status")).toContainText("skipped");
    const s = await watch(page, "Shockwave", 700);
    expect(s.changedFrames).toBeGreaterThan(3);
  });
});

test.describe("reduced motion", () => {
  test.use({ reducedMotion: "reduce" });

  test("only a still ring plays: no shake, no zoom, no impact, no banner", async ({ page }) => {
    await page.goto("/fx-lab/");
    await expect(page.getByRole("note")).toContainText("Effects are off");
    const impact = await watch(page, "Impact frame", 500);
    expect(impact.changedFrames).toBe(0);
    const zoom = await watch(page, "Zoom punch", 500);
    expect(zoom.changedFrames).toBe(0);
    await page.getByRole("button", { name: "Level-up banner" }).click();
    await expect(page.locator(".cutin")).toHaveCount(0);
  });
});

test("pausing freezes the picture on its current frame, and resuming continues", async ({ page }) => {
  await page.goto("/fx-lab/");
  await page.waitForTimeout(300);
  await page.getByRole("checkbox", { name: /Slow motion/ }).check();
  await page.getByRole("button", { name: "Smear and afterimages", exact: true }).click();
  await page.waitForTimeout(500);
  const pause = page.getByRole("button", { name: /Pause on this frame/ });
  await pause.click();
  await expect(page.getByRole("button", { name: "Resume" })).toHaveAttribute("aria-pressed", "true");
  const a = await brightness(page);
  await page.waitForTimeout(400);
  expect(await brightness(page)).toBe(a);
  await page.getByRole("button", { name: "Resume" }).click();
  await expect(page.getByRole("button", { name: /Pause on this frame/ })).toHaveAttribute("aria-pressed", "false");
});

test("the Level-up banner button shows the banner at Normal", async ({ page }) => {
  await page.goto("/fx-lab/");
  await page.getByRole("button", { name: "Level-up banner" }).click();
  await expect(page.locator(".cutin-title")).toHaveText("LEVEL UP");
  await expect(page.locator(".cutin")).toHaveCount(0, { timeout: 5000 });
});

test("Settings links to the lab", async ({ page }) => {
  await page.goto("/settings/");
  await page.getByRole("link", { name: /Preview the effects/ }).click();
  await expect(page).toHaveURL(/\/fx-lab\//);
});
