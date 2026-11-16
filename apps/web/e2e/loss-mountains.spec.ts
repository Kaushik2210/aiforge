import { expect, test } from "@playwright/test";

const board = (page: import("@playwright/test").Page) => page.locator("pre.ascii-board");

test("Loss Mountains draws the board as text with one ball, and stepping moves it and numbers the trail", async ({ page }) => {
  await page.goto("/games/loss-mountains/");
  await expect(board(page)).toHaveAttribute("aria-hidden", "true");
  const before = await board(page).textContent();
  expect(before!.split("@").length - 1).toBe(1);
  await page.getByRole("button", { name: "Step", exact: true }).click();
  await page.getByRole("button", { name: "Step", exact: true }).click();
  const after = await board(page).textContent();
  expect(after).not.toBe(before);
  expect(after!.split("@").length - 1).toBe(1);
  expect(after).toMatch(/1/);
  await expect(page.getByRole("status")).toContainText("Step 2 of");
});

test("the same facts are in words: legend, status line and a table of every step", async ({ page }) => {
  await page.goto("/games/loss-mountains/");
  await expect(page.getByText(/the ball/).first()).toBeVisible();
  await page.getByRole("button", { name: "Step", exact: true }).click();
  await expect(page.getByRole("status")).toContainText(/Position .*Loss/);
  await page.getByText("Table of every step").click();
  await expect(page.getByRole("table")).toContainText("1");
});

test("a win is saved as a Loss Mountains result and shown as cleared", async ({ page }) => {
  await page.goto("/games/loss-mountains/");
  const slider = page.getByLabel(/Learning rate/);
  await slider.focus();
  await slider.fill("700"); // a high but stable rate for level 1
  await page.getByRole("button", { name: "Run to the end" }).click();
  await expect(page.getByRole("status")).toContainText(/reached the goal|Result saved/);
  await expect(page.getByRole("button", { name: /1\. .*\(cleared\)/ })).toBeVisible();
});

test("Walk steps by itself, can be stopped, and never starts on its own", async ({ page }) => {
  await page.goto("/games/loss-mountains/");
  await page.waitForTimeout(900);
  await expect(page.getByRole("status")).toContainText("Step 0 of"); // nothing moved by itself
  await page.getByLabel(/Learning rate/).fill("300");
  await page.getByRole("button", { name: "Walk" }).click();
  await expect(page.getByRole("button", { name: "Stop walking" })).toBeVisible();
  await expect(page.getByRole("status")).not.toContainText("Step 0 of");
  await page.getByRole("button", { name: "Stop walking" }).click();
  const text = await page.getByRole("status").textContent();
  await page.waitForTimeout(800);
  expect(await page.getByRole("status").textContent()).toBe(text);
});

test("every level draws at its fixed size and the page fits phone and tablet widths", async ({ page }) => {
  for (const width of [375, 768]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/games/loss-mountains/");
    for (const n of [1, 2, 3, 4, 5]) {
      await page.getByRole("group", { name: "Choose a level" }).getByRole("button", { name: new RegExp(`^${n}\\.`) }).click();
      const rows = (await board(page).textContent())!.split("\n");
      expect(new Set(rows.map((r) => r.length)).size, `level ${n} rows are equal length`).toBe(1);
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
      expect(overflow, `level ${n} scrolls sideways at ${width}px`).toBeLessThanOrEqual(0);
    }
  }
});
