/**
 * The loss landscape on the home page: a real function and a real gradient descent run on it.
 * Pure maths with no drawing code, so it is unit-tested; the 3D scene only draws these numbers.
 *
 * The surface is a shallow bowl with two wells of different depth and gentle ripples,
 * the kind of landscape a training run actually crosses: more than one valley, one deeper.
 */

export interface Vec2 {
  x: number;
  z: number;
}

export interface Pt extends Vec2 {
  /** The loss (the height of the surface) at this point. */
  y: number;
}

/** The loss at (x, z). Smooth and finite everywhere. */
export function loss(x: number, z: number): number {
  const bowl = 0.07 * (x * x + z * z);
  const deep = -1.9 * Math.exp(-((x - 1.5) ** 2 + (z + 0.9) ** 2) / 0.9);
  const shallow = -1.1 * Math.exp(-((x + 1.6) ** 2 + (z - 1.2) ** 2) / 0.7);
  const ripple = 0.12 * Math.sin(1.7 * x) * Math.cos(1.3 * z);
  return bowl + deep + shallow + ripple;
}

const H = 1e-4;

/** The gradient of the loss at (x, z), by central differences. */
export function gradient(x: number, z: number): Vec2 {
  return {
    x: (loss(x + H, z) - loss(x - H, z)) / (2 * H),
    z: (loss(x, z + H) - loss(x, z - H)) / (2 * H),
  };
}

export const START: Vec2 = { x: -3.1, z: 2.5 };
export const LEARNING_RATE = 0.42;
export const STEPS = 90;

/**
 * Plain gradient descent from `start`: x <- x - lr * gradient. Returns every position,
 * including the start, so there are `steps + 1` points. Throws on a bad learning rate or step count.
 */
export function descentPath(start: Vec2 = START, lr: number = LEARNING_RATE, steps: number = STEPS): Pt[] {
  if (!Number.isFinite(lr) || lr <= 0) throw new Error("the learning rate must be a positive number");
  if (!Number.isInteger(steps) || steps < 1 || steps > 10_000) throw new Error("steps must be a whole number from 1 to 10000");
  const path: Pt[] = [];
  let { x, z } = start;
  path.push({ x, z, y: loss(x, z) });
  for (let i = 0; i < steps; i++) {
    const g = gradient(x, z);
    x -= lr * g.x;
    z -= lr * g.z;
    path.push({ x, z, y: loss(x, z) });
  }
  return path;
}

/** The point a fraction `t` (0 to 1) of the way along a path, blending neighbouring points. */
export function pointAt(path: readonly Pt[], t: number): Pt {
  if (path.length === 0) throw new Error("the path is empty");
  const clamped = Number.isFinite(t) ? Math.min(1, Math.max(0, t)) : 0;
  const f = clamped * (path.length - 1);
  const i = Math.min(path.length - 2, Math.floor(f));
  if (path.length === 1) return path[0]!;
  const u = f - i;
  const a = path[i]!;
  const b = path[i + 1]!;
  return { x: a.x + (b.x - a.x) * u, z: a.z + (b.z - a.z) * u, y: a.y + (b.y - a.y) * u };
}

/** The step number (0-based) at a fraction `t` of the way along a path. */
export function stepAt(path: readonly Pt[], t: number): number {
  const clamped = Number.isFinite(t) ? Math.min(1, Math.max(0, t)) : 0;
  return Math.round(clamped * (path.length - 1));
}

/** The smallest and largest loss over a square grid, used to colour the surface. */
export function lossRange(half = 4, n = 64): { min: number; max: number } {
  let min = Infinity;
  let max = -Infinity;
  for (let i = 0; i <= n; i++) {
    for (let j = 0; j <= n; j++) {
      const v = loss(-half + (2 * half * i) / n, -half + (2 * half * j) / n);
      if (v < min) min = v;
      if (v > max) max = v;
    }
  }
  return { min, max };
}
