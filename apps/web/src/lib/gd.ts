/** Pure logic behind the L1 demo: gradient descent on f(x) = x^2. */

export type Verdict = "converging" | "oscillating" | "diverging" | "stuck";

/** Iterates x0, x1, ..., x_steps for f(x) = x^2 (gradient 2x). */
export function iterates(x0: number, lr: number, steps: number): number[] {
  const xs = [x0];
  let x = x0;
  for (let i = 0; i < steps; i++) {
    x = x - lr * 2 * x;
    xs.push(x);
  }
  return xs;
}

/** Per-step multiplier 1 - 2*lr; |factor| < 1 is the stability condition. */
export function factor(lr: number): number {
  return 1 - 2 * lr;
}

export function verdict(lr: number): Verdict {
  const f = factor(lr);
  if (lr <= 0) return "stuck";
  if (Math.abs(f) > 1) return "diverging";
  if (Math.abs(f) === 1) return "oscillating";
  return f < 0 ? "oscillating" : "converging";
}

export const VERDICT_TEXT: Record<Verdict, string> = {
  converging: "Converging: each step shrinks x.",
  oscillating: "Bouncing across the minimum. It converges only if the factor magnitude stays below 1.",
  diverging: "Diverging: the step overshoots by more than it gains, so x grows.",
  stuck: "Not moving: the learning rate must be above 0.",
};
