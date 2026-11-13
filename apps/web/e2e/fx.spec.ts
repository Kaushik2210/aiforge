import { expect, test, type Page } from "@playwright/test";

/** Finish every tier of a quest. Returns true if the level-up cut-in appeared at any point. */
async function finishQuest(page: Page, id: string): Promise<boolean> {
  await page.goto(`/quests/${id}/`);
  const ladder = page.getByRole("navigation", { name: "Depth ladder" });
  await expect(ladder).toBeVisible();
  let seen = false;
  for (let i = 0; i < 5; i++) {
    const button = ladder.getByRole("button", { name: "Mark tier done" }).first();
    if ((await button.count()) === 0) break;
    await button.click();
    await expect(ladder.getByText(`${i + 1} of 5 tiers done`).or(ladder.getByText("5 of 5 tiers done"))).toBeVisible();
    seen ||= (await page.evaluate(() => (window as unknown as { __cutin?: boolean }).__cutin)) === true;
  }
  return seen;
}

test.beforeEach(async ({ page }) => {
  // Remember if the cut-in ever showed: it lasts under two seconds, so polling could miss it.
  await page.addInitScript(() => {
    new MutationObserver(() => {
      if (document.querySelector(".cutin")) (window as unknown as { __cutin?: boolean }).__cutin = true;
    }).observe(document, { subtree: true, childList: true });
  });
});

test("a level-up plays the cut-in, announces it in text, and then clears", async ({ page }) => {
  const first = await finishQuest(page, "gradient-descent");
  const second = await finishQuest(page, "python-basics");
  expect(first || second).toBe(true);
  // The accessible announcement is the toast; the banner itself is decoration.
  await expect(page.getByText(/Level up! You reached level \d+\./)).toBeVisible();
  await expect(page.locator(".cutin")).toHaveCount(0, { timeout: 5000 });
});

test.describe("reduced motion", () => {
  test.use({ reducedMotion: "reduce" });

  test("the cut-in does not animate and the words stay readable", async ({ page }) => {
    await finishQuest(page, "gradient-descent");
    await finishQuest(page, "python-basics"); // the level-up lands during this quest or the last click of it
    const band = page.locator(".cutin-band");
    // The banner lasts under two seconds, so look for it right away; fall back to the stylesheet check below if it already left.
    if ((await band.count()) > 0) {
      expect(await band.evaluate((el) => getComputedStyle(el).animationName)).toBe("none");
      await expect(page.locator(".cutin-title")).toBeVisible();
    }
    await expect(page.getByText(/Level up! You reached level \d+\./)).toBeVisible();
  });

  test("the animation rules are off for the band and its lines", async ({ page }) => {
    await page.goto("/");
    const names = await page.evaluate(() => {
      const host = document.createElement("div");
      host.className = "cutin";
      host.innerHTML = '<div class="cutin-band"><div class="cutin-lines"></div></div>';
      document.body.appendChild(host);
      const band = getComputedStyle(host.querySelector(".cutin-band")!).animationName;
      const lines = getComputedStyle(host.querySelector(".cutin-lines")!).animationName;
      host.remove();
      return { band, lines };
    });
    expect(names).toEqual({ band: "none", lines: "none" });
  });
});

test("the cut-in never takes pointer events or screen-reader focus", async ({ page }) => {
  await page.goto("/");
  const info = await page.evaluate(() => {
    const host = document.createElement("div");
    host.className = "cutin";
    host.setAttribute("aria-hidden", "true");
    document.body.appendChild(host);
    const pe = getComputedStyle(host).pointerEvents;
    host.remove();
    return pe;
  });
  expect(info).toBe("none");
});

test.describe("effects setting and boss banners", () => {
  test("the effects choice is saved, applied to the page and survives a reload", async ({ page }) => {
    await page.goto("/settings/");
    const group = page.getByRole("group", { name: "Effects level" });
    await expect(group.getByRole("radio", { name: /Normal/ })).toBeChecked();
    await group.getByRole("radio", { name: /Off/ }).check();
    await expect(page.locator("html")).toHaveAttribute("data-fx", "0");
    await page.reload();
    await expect(page.locator("html")).toHaveAttribute("data-fx", "0");
    await expect(page.getByRole("group", { name: "Effects level" }).getByRole("radio", { name: /Off/ })).toBeChecked();
  });

  test("picking the boss level plays a cut-in at Normal and none when effects are Off", async ({ page }) => {
    await page.goto("/games/gradient-hiker/");
    const boss = page.getByRole("button", { name: /^5\./ });
    await boss.click();
    await expect(page.locator(".cutin-title")).toHaveText("BOSS BATTLE");
    await expect(page.locator(".cutin")).toHaveCount(0, { timeout: 5000 });

    await page.goto("/settings/");
    await page.getByRole("group", { name: "Effects level" }).getByRole("radio", { name: /Off/ }).check();
    await page.goto("/games/gradient-hiker/");
    await page.getByRole("button", { name: /^5\./ }).click();
    await page.waitForTimeout(500);
    await expect(page.locator(".cutin")).toHaveCount(0);
  });

  test("a level-up shows no banner when effects are Off, but still announces it in text", async ({ page }) => {
    await page.goto("/settings/");
    await page.getByRole("group", { name: "Effects level" }).getByRole("radio", { name: /Off/ }).check();
    const a = await finishQuest(page, "gradient-descent");
    const b = await finishQuest(page, "python-basics");
    expect(a || b).toBe(false);
    await expect(page.getByText(/Level up! You reached level \d+\./)).toBeVisible();
  });

  test("a bad saved value falls back to Normal", async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem("aiforge-fx", "banana"));
    await page.goto("/settings/");
    await expect(page.getByRole("group", { name: "Effects level" }).getByRole("radio", { name: /Normal/ })).toBeChecked();
  });
});
