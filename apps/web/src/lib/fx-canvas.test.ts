import { describe, expect, it } from "vitest";
import type { FxFrame } from "@aiforge/games";
import { INK, SCENE_H, SCENE_W, drawFxScene, type Palette } from "./fx-canvas";

const palette: Palette = { bg: "#000001", surface: "#000002", text: "#000003", primary: "#000004", accent: "#000005", xp: "#000006" };
const idle: FxFrame = { timeScale: 1, shake: { x: 0, y: 0 }, zoom: 1, lines: [], lineAlpha: 0, shockwaves: [], ghosts: [], impact: 0, smear: null, active: false };

/** A canvas stand-in that records what is drawn, so the drawing rules can be tested without a browser. */
function recorder() {
  const calls: { op: string; args: unknown[]; fill: string; alpha: number }[] = [];
  const state = { fill: "", stroke: "", alpha: 1, saves: 0 };
  const stack: { fill: string; alpha: number }[] = [];
  const ctx = new Proxy({} as Record<string, unknown>, {
    get(_t, prop: string) {
      if (prop === "save") return () => { stack.push({ fill: state.fill, alpha: state.alpha }); state.saves++; };
      if (prop === "restore") return () => { const s = stack.pop(); if (s) { state.fill = s.fill; state.alpha = s.alpha; } state.saves--; };
      if (prop === "fillStyle") return state.fill;
      if (prop === "globalAlpha") return state.alpha;
      return (...args: unknown[]) => { calls.push({ op: prop, args, fill: state.fill, alpha: state.alpha }); };
    },
    set(_t, prop: string, value: unknown) {
      if (prop === "fillStyle") state.fill = String(value);
      if (prop === "strokeStyle") state.stroke = String(value);
      if (prop === "globalAlpha") state.alpha = Number(value);
      return true;
    },
  }) as unknown as CanvasRenderingContext2D;
  return { ctx, calls, state };
}

const draw = (frame: FxFrame) => {
  const r = recorder();
  drawFxScene(r.ctx, frame, { hiker: { x: 90, y: 270 } }, palette);
  return r;
};

describe("drawFxScene", () => {
  it("balances every save with a restore", () => {
    const frame: FxFrame = { ...idle, smear: { angle: 0.3, along: 2, across: 0.7 }, impact: 0.7, active: true, lines: [{ x1: 0, y1: 0, x2: 5, y2: 5, width: 2 }], lineAlpha: 1, ghosts: [{ x: 1, y: 1, alpha: 0.3 }], shockwaves: [{ x: 5, y: 5, radius: 20, alpha: 0.5, still: false }] };
    expect(draw(frame).state.saves).toBe(0);
  });

  it("draws no dark overlay when idle, and a full-canvas ink overlay at the frame's alpha during an impact", () => {
    const none = draw(idle).calls.filter((c) => c.op === "fillRect" && c.fill === INK);
    expect(none).toHaveLength(0);
    const hit = draw({ ...idle, impact: 0.7, active: true }).calls.filter((c) => c.op === "fillRect" && c.fill === INK);
    expect(hit).toHaveLength(1);
    expect(hit[0]!.args).toEqual([0, 0, SCENE_W, SCENE_H]);
    expect(hit[0]!.alpha).toBe(0.7);
  });

  it("the impact ink is a dark colour, never white", () => {
    const n = parseInt(INK.slice(1), 16);
    const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255];
    expect(Math.max(r, g, b)).toBeLessThan(40);
  });

  it("applies the camera zoom about the centre and the shake as a translation", () => {
    const { calls } = draw({ ...idle, zoom: 1.05, shake: { x: 3, y: -2 }, active: true });
    const translate = calls.find((c) => c.op === "translate")!;
    expect(translate.args).toEqual([SCENE_W / 2 + 3, SCENE_H / 2 - 2]);
    const scale = calls.find((c) => c.op === "scale")!;
    expect(scale.args).toEqual([1.05, 1.05]);
  });

  it("stretches the hiker along the smear angle (rotate, scale, rotate back)", () => {
    const { calls } = draw({ ...idle, smear: { angle: 0.5, along: 2, across: 0.7 }, active: true });
    const ops = calls.map((c) => c.op);
    const scales = calls.filter((c) => c.op === "scale").map((c) => c.args);
    expect(scales).toContainEqual([2, 0.7]);
    expect(calls.filter((c) => c.op === "rotate").map((c) => c.args[0])).toEqual([0.5, -0.5]);
    expect(ops.indexOf("rotate")).toBeLessThan(ops.indexOf("rotate", ops.indexOf("rotate") + 1));
  });

  it("draws one stroked line per speed line, one silhouette per ghost and two strokes per ring", () => {
    const lines = Array.from({ length: 5 }, (_, i) => ({ x1: i, y1: 0, x2: i + 4, y2: 9, width: 2 }));
    const base = draw(idle).calls.filter((c) => c.op === "stroke").length;
    const withLines = draw({ ...idle, lines, lineAlpha: 1, active: true }).calls.filter((c) => c.op === "stroke").length;
    expect(withLines - base).toBe(5);
    const withRing = draw({ ...idle, shockwaves: [{ x: 5, y: 5, radius: 20, alpha: 1, still: false }], active: true }).calls.filter((c) => c.op === "stroke").length;
    expect(withRing - base).toBe(2);
    const arcs = (f: FxFrame) => draw(f).calls.filter((c) => c.op === "arc").length;
    expect(arcs({ ...idle, ghosts: [{ x: 1, y: 1, alpha: 0.3 }, { x: 2, y: 2, alpha: 0.2 }], active: true }) - arcs(idle)).toBe(2 * 1); // a ghost is a head circle
  });

  it("never draws a negative radius", () => {
    const { calls } = draw({ ...idle, shockwaves: [{ x: 5, y: 5, radius: -5, alpha: 1, still: false }], active: true });
    for (const c of calls.filter((x) => x.op === "arc")) expect(c.args[2] as number).toBeGreaterThanOrEqual(0);
  });

  it("moves to the centre plus shake, then zooms, then moves back (in that order)", () => {
    const { calls } = draw({ ...idle, zoom: 1.1, shake: { x: 4, y: 5 }, active: true });
    const camera = calls.filter((c) => c.op === "translate" || c.op === "scale").slice(0, 3);
    expect(camera.map((c) => c.op)).toEqual(["translate", "scale", "translate"]);
    expect(camera[0]!.args).toEqual([SCENE_W / 2 + 4, SCENE_H / 2 + 5]);
    expect(camera[2]!.args).toEqual([-SCENE_W / 2, -SCENE_H / 2]);
  });

  it("draws each ghost at its own alpha and speed lines at 60 percent of the frame's line alpha", () => {
    const ghostArcs = draw({ ...idle, ghosts: [{ x: 5, y: 5, alpha: 0.3 }], active: true }).calls.filter((c) => c.op === "arc" && c.alpha === 0.3);
    expect(ghostArcs.length).toBeGreaterThan(0);
    const lineStrokes = draw({ ...idle, lines: [{ x1: 0, y1: 0, x2: 9, y2: 9, width: 2 }], lineAlpha: 0.5, active: true }).calls.filter((c) => c.op === "stroke" && c.alpha === 0.3);
    expect(lineStrokes).toHaveLength(1);
  });
});

