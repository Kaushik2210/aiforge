import { describe, expect, it } from "vitest";
import {
  ASCII_COLS_1D,
  ASCII_COLS_2D,
  ASCII_ROWS_1D,
  ASCII_ROWS_2D,
  RAMP,
  glyphForLoss,
  renderAscii,
} from "./ascii";
import { getLevel, initialState, runToEnd, step, LEVEL_IDS } from "./logic";

const count = (rows: string[], ch: string) => rows.join("").split(ch).length - 1;

describe("glyphForLoss", () => {
  it("is never heavier for a lower loss", () => {
    let last = -1;
    for (let l = 0; l <= 100; l++) {
      const idx = RAMP.indexOf(glyphForLoss(l, 100));
      expect(idx).toBeGreaterThanOrEqual(last);
      last = idx;
    }
  });
  it("uses the lightest glyph at zero and the heaviest at the top, and survives bad numbers", () => {
    expect(glyphForLoss(0, 10)).toBe(RAMP[0]);
    expect(glyphForLoss(10, 10)).toBe(RAMP.at(-1));
    expect(glyphForLoss(1000, 10)).toBe(RAMP.at(-1));
    expect(glyphForLoss(Number.NaN, 10)).toBe(RAMP[0]);
    expect(glyphForLoss(5, 0)).toBe(RAMP[0]);
  });
});

describe("renderAscii", () => {
  it("draws every level as equal-length rows of the expected size", () => {
    for (const id of LEVEL_IDS) {
      const level = getLevel(id);
      const view = renderAscii(level, initialState(level));
      const dims = level.landscape.dims === 1 ? [ASCII_ROWS_1D, ASCII_COLS_1D] : [ASCII_ROWS_2D, ASCII_COLS_2D];
      expect(view.rows).toHaveLength(dims[0]!);
      for (const row of view.rows) expect(row).toHaveLength(dims[1]!);
    }
  });

  it("shows the ball exactly once at the start and starts the trail at 0 under it", () => {
    for (const id of LEVEL_IDS) {
      const level = getLevel(id);
      const view = renderAscii(level, initialState(level));
      expect(count(view.rows, "@")).toBe(1);
      expect(view.ball).toBe("on-map");
    }
  });

  it("numbers the steps in the trail", () => {
    const level = getLevel(1);
    let state = initialState(level);
    for (let i = 0; i < 3; i++) state = step(level, state, 0.2);
    const view = renderAscii(level, state);
    const text = view.rows.join("");
    expect(text).toContain("0");
    expect(text).toContain("1");
    expect(text).toContain("2");
    expect(count(view.rows, "@")).toBe(1);
  });

  it("marks the goal: a waterline in loss levels on the side view, V cells on the map", () => {
    const side = renderAscii(getLevel(1), initialState(getLevel(1)));
    expect(count(side.rows, "~")).toBeGreaterThan(0);
    const map = renderAscii(getLevel(3), initialState(getLevel(3)));
    expect(count(map.rows, "V")).toBeGreaterThan(0);
  });

  it("puts the ground under the surface in the side view", () => {
    const view = renderAscii(getLevel(1), initialState(getLevel(1)));
    expect(count(view.rows, "#")).toBeGreaterThanOrEqual(ASCII_COLS_1D);
    expect(count(view.rows, ":")).toBeGreaterThan(0);
  });

  it("shows an arrow instead of the ball when it flies off the map", () => {
    const level = getLevel(2);
    const state = runToEnd(level, initialState(level), 1.5); // far past the stability limit
    expect(state.status).toBe("diverged");
    const view = renderAscii(level, state);
    expect(view.ball).not.toBe("on-map");
    expect(count(view.rows, "@")).toBe(0);
    expect(view.rows.join("")).toMatch(/[<>]/);
    expect(view.description).toContain("left the map");
  });

  it("describes the run in words with the step, position, loss, goal and outcome", () => {
    const level = getLevel(1);
    const state = runToEnd(level, initialState(level), 0.5);
    const view = renderAscii(level, state);
    expect(view.description).toContain("Level 1");
    expect(view.description).toContain(`Step ${state.steps} of ${level.budget}`);
    expect(view.description).toContain("Loss");
    expect(view.description).toContain("reached the goal");
  });

  it("is deterministic and does not change its inputs", () => {
    const level = getLevel(5, "seed");
    const state = initialState(level);
    const before = JSON.stringify(state);
    const a = renderAscii(level, state);
    const b = renderAscii(level, state);
    expect(a).toEqual(b);
    expect(JSON.stringify(state)).toBe(before);
  });

  it("explains the glyphs in a legend", () => {
    for (const id of LEVEL_IDS) {
      const level = getLevel(id);
      const view = renderAscii(level, initialState(level));
      expect(view.legend.join("\n")).toContain("@");
      expect(view.legend.length).toBeGreaterThanOrEqual(3);
    }
  });
});
