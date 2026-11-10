import type { Pt } from "../map/layout";
import type { Level } from "./logic";

/**
 * Pure drawing maths for the Hiker: what to plot and how to map the landscape
 * onto the canvas. No Phaser here so it can be unit-tested.
 */

export interface Bounds {
  xMin: number;
  xMax: number;
  yMin: number;
  yMax: number;
}

/** The part of the landscape to show: wide enough for the start, the goal and some overshoot. */
export function viewBounds(level: Level): Bounds {
  if (level.landscape.dims === 1) {
    const reach = Math.max(4, Math.abs(level.start[0]!) * 1.25);
    const xMax = level.id === 4 ? 4.5 : reach;
    const xs = Array.from({ length: 121 }, (_, i) => -xMax + (i * 2 * xMax) / 120);
    const ys = xs.map((x) => level.landscape.loss([x]));
    const lo = Math.min(...ys);
    const hi = Math.min(Math.max(...ys), level.landscape.loss(level.start) * 1.25);
    return { xMin: -xMax, xMax, yMin: Math.min(lo, 0) - (hi - lo) * 0.05, yMax: hi };
  }
  const rx = Math.abs(level.start[0]!) * 1.3 + 1;
  const ry = Math.abs(level.start[1]!) * 1.5 + 1;
  return { xMin: -rx, xMax: rx, yMin: -ry, yMax: ry };
}

/** Sample the 1-D loss curve for drawing (clipped to the view's top). */
export function curve1D(level: Level, bounds: Bounds, samples = 160): Pt[] {
  return Array.from({ length: samples + 1 }, (_, i) => {
    const x = bounds.xMin + (i * (bounds.xMax - bounds.xMin)) / samples;
    return { x, y: Math.min(level.landscape.loss([x]), bounds.yMax) };
  });
}

export interface Ellipse {
  loss: number;
  /** Half-width along x and y in landscape units. */
  rx: number;
  ry: number;
}

/**
 * Contour ellipses of a 2-D quadratic: loss = c is the ellipse with half-axes
 * sqrt(2c/a) and sqrt(2c/b). Returned from the outermost (the start's own
 * loss) inward, so they can be filled from back to front.
 */
export function contours(level: Level, count = 6): Ellipse[] {
  const c = level.landscape.curvatures;
  if (!c || c.length !== 2) return [];
  const top = level.landscape.loss(level.start);
  return Array.from({ length: count }, (_, i) => {
    const loss = top * Math.pow(1 - i / count, 2.2);
    return { loss, rx: Math.sqrt((2 * loss) / c[0]!), ry: Math.sqrt((2 * loss) / c[1]!) };
  });
}

export interface Viewport {
  width: number;
  height: number;
  /** Space kept free around the plot, in pixels. */
  margin: number;
}

/** Map landscape coordinates to canvas pixels (y flipped so bigger loss is higher). */
export function makeProjector(bounds: Bounds, view: Viewport) {
  const w = view.width - 2 * view.margin;
  const h = view.height - 2 * view.margin;
  return {
    x: (x: number) => view.margin + ((x - bounds.xMin) / (bounds.xMax - bounds.xMin)) * w,
    y: (y: number) => view.margin + h - ((y - bounds.yMin) / (bounds.yMax - bounds.yMin)) * h,
    /** Pixels per landscape unit along each axis. */
    scaleX: w / (bounds.xMax - bounds.xMin),
    scaleY: h / (bounds.yMax - bounds.yMin),
  };
}

export type MarkerShape = "circle" | "triangle" | "square";
const SHAPES: MarkerShape[] = ["circle", "triangle", "square"];

/** Trail markers cycle through shapes so the order is readable without relying on colour. */
export function markerShape(stepIndex: number): MarkerShape {
  return SHAPES[((stepIndex % 3) + 3) % 3]!;
}

/** True when the last step made the loss grow: the cue for the overshoot speed lines. */
export function overshot(losses: readonly number[]): boolean {
  return losses.length >= 2 && losses.at(-1)! > losses.at(-2)!;
}

/** Local minima of a 1-D landscape on the view (where the ball can settle), left to right. */
export function valleys1D(level: Level, bounds: Bounds, samples = 400): Pt[] {
  const pts = Array.from({ length: samples + 1 }, (_, i) => {
    const x = bounds.xMin + (i * (bounds.xMax - bounds.xMin)) / samples;
    return { x, y: level.landscape.loss([x]) };
  });
  const out: Pt[] = [];
  for (let i = 1; i < pts.length - 1; i++) {
    if (pts[i]!.y < pts[i - 1]!.y && pts[i]!.y <= pts[i + 1]!.y) out.push(pts[i]!);
  }
  return out;
}
