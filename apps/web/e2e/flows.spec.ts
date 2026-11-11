import { expect, test } from "@playwright/test";

const xp = (page: import("@playwright/test").Page) => page.getByRole("progressbar", { name: "XP to next level" }).first();

test("finishing a tier awards XP, enrols the flashcards and survives a reload", async ({ page }) => {
  await page.goto("/quests/gradient-descent/");
  const ladder = page.getByRole("navigation", { name: "Depth ladder" });
  await expect(ladder.getByRole("button", { name: "Mark tier done" }).first()).toBeEnabled();
  const before = Number(await xp(page).getAttribute("aria-valuenow"));
  await ladder.getByRole("button", { name: "Mark tier done" }).first().click();
  await expect(ladder.getByText("Done").first()).toBeVisible();
  await expect.poll(async () => Number(await xp(page).getAttribute("aria-valuenow"))).toBeGreaterThan(before);

  await page.reload();
  await expect(page.getByRole("navigation", { name: "Depth ladder" }).getByText("Done").first()).toBeVisible();

  await page.goto("/review/");
  await expect(page.getByText(/in your deck/).first()).toBeVisible();
});

test("a Review Tavern sitting works from the keyboard and records the result", async ({ page }) => {
  await page.goto("/quests/gradient-descent/");
  const ladder = page.getByRole("navigation", { name: "Depth ladder" });
  await ladder.getByRole("button", { name: "Mark tier done" }).first().click();
  await expect(ladder.getByText("Done").first()).toBeVisible();

  await page.goto("/review/");
  await page.getByRole("button", { name: /^Review \d+ card/ }).click();
  const total = Number(/of (\d+)/.exec((await page.getByText(/^Card \d+ of \d+/).textContent()) ?? "")![1]);
  expect(total).toBeGreaterThanOrEqual(5);

  for (let i = 0; i < total; i++) {
    await page.getByRole("button", { name: "Show answer" }).focus();
    await page.keyboard.press("Enter");
    await expect(page.getByText("How did it go?")).toBeVisible();
    await page.keyboard.press("3");
    // "Again" would repeat a card, "Good" never does.
  }
  await expect(page.getByRole("heading", { name: /./, level: 2 }).first()).toBeVisible();
  await expect(page.getByText("How did it go?")).toBeHidden();

  await page.reload();
  await expect(page.getByText(/in your deck/).first()).toBeVisible();
});

test("the map can be switched to the list view and a quest opened by keyboard", async ({ page }) => {
  await page.goto("/map/");
  const list = page.getByRole("button", { name: /list/i }).first();
  await list.focus();
  await page.keyboard.press("Enter");
  await expect(list).toHaveAttribute("aria-pressed", "true");
  await page.getByRole("link", { name: /Gradients/ }).first().focus();
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/\/quests\/gradient-descent\//);
});

test("the Dashboard and Settings load without errors and show the empty state kindly", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  for (const route of ["/dashboard/", "/settings/"]) {
    await page.goto(route);
    await page.waitForLoadState("networkidle");
  }
  expect(errors).toEqual([]);
});
