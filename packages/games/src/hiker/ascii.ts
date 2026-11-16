import { GRADIENT_FLAT, type HikerState, type Level } from "./logic";
import { viewBounds, type Bounds } from "./view";

/**
 * Loss Mountains: Gradient Hiker drawn with characters. Pure functions that turn a
 * level and a run into rows of text, with no DOM and no Phaser, so the drawing can be
 * tested. Meaning is carried by glyph shape, never by colour:
 *
 *   height ramp (low loss to high loss):  " .:-=+*%W"   (2-D contour map)
 *   ground "#" with rock ":" below it, goal waterline "~", drawn through sky and rock but never over the ground   (1-D side view)
 *   trail digits are the step number (0 is the start, then 1, 2, ... wrapping after 9)
 *   "@" is the ball, "V" the goal area, "<" or ">" a ball that left the map
 */

/** Glyphs from the lowest loss to the highest. */
export const RAMP = " .:-=+*%W";

const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));

/** The glyph for a loss, relative to the loss at the start. Never heavier for a lower loss. */
export function glyphForLoss(loss: number, topLoss: number): string {
  const t = topLoss > 0 && Number.isFinite(loss) ? clamp(loss / topLoss, 0, 1) : 0;
  return RAMP[Math.min(RAMP.length - 1, Math.floor(Math.sqrt(t) * RAMP.length))]!;
}

export interface AsciiView {
  /** Equal-length rows of text, top row first. */
  rows: string[];
  /** One line per glyph kind used, for a key under the picture. */
  legend: string[];
  /** A plain-language summary of where the ball is, for screen readers and the live region. */
  description: string;
  /** Where the ball is: on the map, or off one side of it. */
  ball: "on-map" | "off-left" | "off-right";
}

export const ASCII_COLS_1D = 44;
export const ASCII_ROWS_1D = 14;
export const ASCII_COLS_2D = 40;
export const ASCII_ROWS_2D = 18;

function blank(rows: number, cols: number): string[][] {
  return Array.from({ length: rows }, () => Array.from({ length: cols }, () => " "));
}

const join = (grid: string[][]) => grid.map((r) => r.join(""));
const fmt = (n: number, d = 2) => (Number.isFinite(n) ? n.toFixed(d) : "far away");

/** Describe the run in words. */
function describe(level: Level, state: HikerState, ball: AsciiView["ball"]): string {
  const pos = state.pos.map((p) => fmt(p)).join(", ");
  const loss = state.losses.at(-1)!;
  const where = ball === "on-map" ? "" : ` The ball has left the map to the ${ball === "off-left" ? "left" : "right"}.`;
  const status =
    state.status === "won"
      ? " You reached the goal."
      : state.status === "diverged"
        ? " The ball flew off: the steps are overshooting."
        : state.status === "lost"
          ? " Out of steps."
          : "";
  const goal = level.mode === "loss" ? `loss under ${level.target}` : "a flat spot (a minimum)";
  return `Level ${level.id}, ${level.title}. Step ${state.steps} of ${level.budget}. Position ${pos}. Loss ${fmt(loss)}. Goal: ${goal}.${status}${where}`;
}

/** The side view of a 1-D level: the loss curve as a mountain, the goal as a waterline. */
function render1D(level: Level, state: HikerState, b: Bounds): AsciiView {
  const cols = ASCII_COLS_1D;
  const rows = ASCII_ROWS_1D;
  const span = b.xMax - b.xMin;
  const ySpan = b.yMax - b.yMin || 1;
  const xAt = (c: number) => b.xMin + ((c + 0.5) / cols) * span;
  const colOf = (x: number) => Math.floor(((x - b.xMin) / span) * cols);
  const rowOfLoss = (y: number) => Math.round((1 - (clamp(y, b.yMin, b.yMax) - b.yMin) / ySpan) * (rows - 1));
  const surface = Array.from({ length: cols }, (_, c) => rowOfLoss(level.landscape.loss([xAt(c)])));

  const grid = blank(rows, cols);
  for (let c = 0; c < cols; c++) {
    for (let r = 0; r < rows; r++) grid[r]![c] = r < surface[c]! ? " " : r === surface[c] ? "#" : ":";
  }
  if (level.mode === "loss") {
    const goalRow = rowOfLoss(level.target);
    for (let c = 0; c < cols; c++) if (grid[goalRow]![c] !== "#") grid[goalRow]![c] = "~";
  }
  state.trail.forEach((p, i) => {
    const x = p[0]!;
    if (!Number.isFinite(x)) return;
    const c = colOf(x);
    if (c >= 0 && c < cols) grid[Math.max(0, surface[c]! - 1)]![c] = String(i % 10);
  });

  let ball: AsciiView["ball"] = "on-map";
  const x = state.pos[0]!;
  const c = colOf(x);
  if (Number.isFinite(x) && c >= 0 && c < cols) {
    grid[Math.max(0, surface[c]! - 1)]![c] = "@";
  } else if (Number.isFinite(x) ? x < b.xMin : x < 0) {
    ball = "off-left";
    grid[0]![0] = "<";
  } else {
    ball = "off-right";
    grid[0]![cols - 1] = ">";
  }

  const legend = [
    "@ the ball     0 1 2 ... the steps (the number is the step, 0 is the start)",
    "# the ground   : rock below it   higher ground means higher loss",
    ...(level.mode === "loss" ? [`~ the goal line: get the loss under ${level.target}`] : []),
    "< or > the ball left the map",
  ];
  return { rows: join(grid), legend, description: describe(level, state, ball), ball };
}

/** The top-down contour map of a 2-D level: the loss ramp, with the goal area marked. */
function render2D(level: Level, state: HikerState, b: Bounds): AsciiView {
  const cols = ASCII_COLS_2D;
  const rows = ASCII_ROWS_2D;
  const xSpan = b.xMax - b.xMin;
  const ySpan = b.yMax - b.yMin;
  const xAt = (c: number) => b.xMin + ((c + 0.5) / cols) * xSpan;
  const yAt = (r: number) => b.yMax - ((r + 0.5) / rows) * ySpan;
  const colOf = (x: number) => Math.floor(((x - b.xMin) / xSpan) * cols);
  const rowOf = (y: number) => Math.floor(((b.yMax - y) / ySpan) * rows);
  const top = level.landscape.loss(level.start);

  const grid = blank(rows, cols);
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const p = [xAt(c), yAt(r)];
      const loss = level.landscape.loss(p);
      const inGoal =
        level.mode === "loss" ? loss <= level.target : Math.hypot(...level.landscape.grad(p)) <= GRADIENT_FLAT;
      grid[r]![c] = inGoal ? "V" : glyphForLoss(loss, top);
    }
  }
  // The goal area can be smaller than one cell. Every 2-D level is a quadratic bowl whose lowest point is
  // the origin, so always mark the cell that holds it.
  const originCol = colOf(0);
  const originRow = rowOf(0);
  if (originCol >= 0 && originCol < cols && originRow >= 0 && originRow < rows) grid[originRow]![originCol] = "V";

  const place = (p: readonly number[], ch: string): boolean => {
    const x = p[0]!;
    const y = p[1]!;
    if (!Number.isFinite(x) || !Number.isFinite(y)) return false;
    const c = colOf(x);
    const r = rowOf(y);
    if (c < 0 || c >= cols || r < 0 || r >= rows) return false;
    grid[r]![c] = ch;
    return true;
  };
  state.trail.forEach((p, i) => place(p, String(i % 10)));

  let ball: AsciiView["ball"] = "on-map";
  if (!place(state.pos, "@")) {
    const x = state.pos[0]!;
    ball = Number.isFinite(x) && x < b.xMin ? "off-left" : Number.isFinite(x) && x >= b.xMin ? "off-right" : "off-right";
    if (Number.isFinite(x) && x < b.xMin) grid[0]![0] = "<";
    else grid[0]![cols - 1] = ">";
  }

  const legend = [
    "@ the ball     0 1 2 ... the steps (the number is the step, 0 is the start)",
    `V the goal area   ${RAMP.trim()}  from low to high loss (the lighter, the lower)`,
    "x runs left to right and y runs bottom to top; the start is far from the centre",
    "< or > the ball left the map",
  ];
  return { rows: join(grid), legend, description: describe(level, state, ball), ball };
}

/** Draw a level and a run as text. */
export function renderAscii(level: Level, state: HikerState): AsciiView {
  const bounds = viewBounds(level);
  return level.landscape.dims === 1 ? render1D(level, state, bounds) : render2D(level, state, bounds);
}
