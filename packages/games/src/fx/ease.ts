/** Small easing and timing helpers. All inputs and outputs are plain numbers. */

export const clamp01 = (t: number): number => Math.min(1, Math.max(0, t));

/** Fast start, gentle stop. */
export const easeOutCubic = (t: number): number => 1 - Math.pow(1 - clamp01(t), 3);

/** Overshoots 1 by a little and settles: the "anticipation and overshoot" feel. */
export function backOut(t: number, overshoot = 1.70158): number {
  const x = clamp01(t) - 1;
  return 1 + (overshoot + 1) * x * x * x + overshoot * x * x;
}

/**
 * Limited animation: hold each value for `step` frames at `fps`, so motion
 * advances in jumps ("animating on twos" is step 2 at 24 fps = 12 new poses a second).
 */
export function steppedTime(tMs: number, step = 2, fps = 24): number {
  const frameMs = 1000 / fps;
  const held = frameMs * step;
  return Math.floor(tMs / held) * held;
}

/** Index of the held frame at time `tMs`. */
export function heldFrame(tMs: number, step = 2, fps = 24): number {
  return Math.floor(tMs / ((1000 / fps) * step));
}
