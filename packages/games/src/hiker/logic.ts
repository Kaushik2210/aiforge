import { Rng } from "../rng";

/**
 * Gradient Hiker: pure game logic, no Phaser, no DOM.
 *
 * Every step is exactly the lesson's update rule, with optional momentum:
 *     v' = momentum * v - lr * grad(x)
 *     x' = x + v'
 * With momentum = 0 this is `x = x - lr * grad(x)`, nothing hidden.
 */

export type LevelId = 1 | 2 | 3 | 4 | 5;
export const LEVEL_IDS: readonly LevelId[] = [1, 2, 3, 4, 5];

/** The ranges the sliders offer. The solvability checks use these same grids. */
export const LR_MIN = 0.005;
export const LR_MAX = 2;
export const MOMENTUM_MAX = 0.95;

export interface Landscape {
  dims: 1 | 2;
  loss(p: readonly number[]): number;
  grad(p: readonly number[]): number[];
  /** For quadratic landscapes: curvature along each axis (the Hessian diagonal). */
  curvatures?: readonly number[];
}

export interface Level {
  id: LevelId;
  title: string;
  /** One sentence telling the player what to do. */
  goal: string;
  landscape: Landscape;
  start: readonly number[];
  /** Steps allowed. */
  budget: number;
  /** "loss": win when loss <= target. "gradient": win when the gradient is nearly flat (a minimum). */
  mode: "loss" | "gradient";
  target: number;
  momentumAvailable: boolean;
  /** Where the global minimum sits, when there is more than one basin (level 4). */
  basins?: { globalSide: -1 | 1 };
}

const quadratic = (curvatures: readonly number[]): Landscape => ({
  dims: curvatures.length as 1 | 2,
  curvatures,
  loss: (p) => 0.5 * curvatures.reduce((s, c, i) => s + c * p[i]! * p[i]!, 0),
  grad: (p) => curvatures.map((c, i) => c * p[i]!),
});

/** f(x) = (x^2 - 4)^2 / 4 + 0.8 x: a deep basin near x = -2.1 and a shallower one near x = 1.9. */
const twoBasins: Landscape = {
  dims: 1,
  loss: (p) => 0.25 * (p[0]! * p[0]! - 4) ** 2 + 0.8 * p[0]!,
  grad: (p) => [p[0]! * (p[0]! * p[0]! - 4) + 0.8],
};

export const GRADIENT_FLAT = 0.05;

function makeLevel(id: 1 | 2 | 3): Level {
  switch (id) {
    case 1:
      return {
        id, title: "First steps",
        goal: "Pick a learning rate that gets the loss under 0.5 within 10 steps.",
        landscape: quadratic([2]), start: [10], budget: 10, mode: "loss", target: 0.5, momentumAvailable: false,
      };
    case 2:
      return {
        id, title: "The speed limit",
        goal: "A steeper hill. Get the loss under 0.5 within 12 steps, then try going past the limit to watch it blow up.",
        landscape: quadratic([5]), start: [10], budget: 12, mode: "loss", target: 0.5, momentumAvailable: false,
      };
    case 3:
      return {
        id, title: "The narrow valley",
        goal: "Steep walls, gentle floor. Plain steps zig-zag; add momentum to get the loss under 0.5 within 10 steps.",
        landscape: quadratic([1, 10]), start: [8, 3], budget: 10, mode: "loss", target: 0.5, momentumAvailable: true,
      };
  }
}

/** Level 4: which side you start on comes from the seed. */
function twoBasinLevel(seed: number | string): Level {
  const rng = new Rng(`${seed}:basins`);
  const side = rng.chance(0.5) ? 1 : -1;
  return {
    id: 4, title: "Two valleys",
    goal: "Two valleys, one deeper. Settle in a valley within 25 steps. The deeper one scores higher.",
    landscape: twoBasins, start: [side * rng.range(2.6, 3.4)], budget: 25, mode: "gradient", target: GRADIENT_FLAT,
    momentumAvailable: true, basins: { globalSide: -1 },
  };
}

/* ------------------------------------------------------------------ state */

export type Status = "running" | "won" | "lost" | "diverged";

export interface HikerState {
  pos: number[];
  vel: number[];
  steps: number;
  /** Position after each step, starting with the start point. */
  trail: number[][];
  losses: number[];
  status: Status;
  wonAtStep: number | null;
}

export function initialState(level: Level): HikerState {
  const pos = [...level.start];
  return {
    pos,
    vel: pos.map(() => 0),
    steps: 0,
    trail: [pos],
    losses: [level.landscape.loss(pos)],
    status: "running",
    wonAtStep: null,
  };
}

const norm = (v: readonly number[]) => Math.hypot(...v);

/** One step. Pure: returns a new state. Does nothing once the run has ended. */
export function step(level: Level, state: HikerState, lr: number, momentum = 0): HikerState {
  if (state.status !== "running") return state;
  const beta = level.momentumAvailable ? Math.min(MOMENTUM_MAX, Math.max(0, momentum)) : 0;
  const g = level.landscape.grad(state.pos);
  const vel = state.vel.map((v, i) => beta * v - lr * g[i]!);
  const pos = state.pos.map((x, i) => x + vel[i]!);
  const loss = level.landscape.loss(pos);
  const steps = state.steps + 1;

  let status: Status = "running";
  let wonAtStep: number | null = null;
  const blowUp = Math.max(1e6, 1e4 * state.losses[0]!);
  if (!Number.isFinite(loss) || loss > blowUp || pos.some((x) => !Number.isFinite(x))) status = "diverged";
  else if (level.mode === "loss" ? loss <= level.target : norm(level.landscape.grad(pos)) <= level.target) {
    status = "won";
    wonAtStep = steps;
  } else if (steps >= level.budget) status = "lost";

  return { pos, vel, steps, trail: [...state.trail, pos], losses: [...state.losses, loss], status, wonAtStep };
}

/** Keep stepping until the run ends. */
export function runToEnd(level: Level, state: HikerState, lr: number, momentum = 0): HikerState {
  let s = state;
  while (s.status === "running") s = step(level, s, lr, momentum);
  return s;
}

/** 0 to 1. Winning fast scores higher; settling in the shallow valley on level 4 costs a little. */
export function scoreFor(level: Level, state: HikerState): number {
  if (state.status !== "won" || state.wonAtStep === null) return 0;
  const speed = 1 - state.wonAtStep / level.budget;
  let score = 0.6 + 0.4 * speed;
  if (level.basins && Math.sign(state.pos[0]!) !== level.basins.globalSide) score -= 0.2;
  return Math.min(1, Math.max(0.1, Math.round(score * 100) / 100));
}

/** True when the ball ended in the deeper valley (level 4). */
export function inGlobalBasin(level: Level, state: HikerState): boolean {
  return Boolean(level.basins) && Math.sign(state.pos[0]!) === level.basins!.globalSide;
}

/* -------------------------------------------------------------- stability */

/**
 * The largest learning rate that still converges on a quadratic landscape:
 * 2 * (1 + momentum) / (largest curvature). With no momentum this is the
 * lesson's 2/L. Returns null for non-quadratic landscapes. (The tests check
 * this against real simulations rather than trusting the formula.)
 */
export function maxStableLr(level: Level, momentum = 0): number | null {
  const c = level.landscape.curvatures;
  if (!c) return null;
  const beta = level.momentumAvailable ? Math.min(MOMENTUM_MAX, Math.max(0, momentum)) : 0;
  return (2 * (1 + beta)) / Math.max(...c);
}

/* --------------------------------------------------------------- feedback */

export interface Feedback {
  tone: "good" | "warn" | "bad" | "info";
  headline: string;
  detail: string;
}

const fmt = (n: number, d = 2) => n.toFixed(d);

/** Plain-language feedback for the current settings and state. Used by the game and the accessible version. */
export function feedback(level: Level, state: HikerState, lr: number, momentum = 0): Feedback {
  const cap = maxStableLr(level, momentum);
  const loss = state.losses.at(-1)!;

  if (state.status === "won") {
    const extra = level.basins ? (inGlobalBasin(level, state) ? " You found the deeper valley." : " It is the shallower valley; a deeper one exists.") : "";
    return { tone: "good", headline: `Converged in ${state.wonAtStep} step${state.wonAtStep === 1 ? "" : "s"}.`, detail: `Loss ${fmt(loss, 3)}.${extra}` };
  }
  if (state.status === "diverged") {
    return {
      tone: "bad",
      headline: "Diverging: the steps overshoot more than they gain.",
      detail: cap !== null ? `A learning rate of ${fmt(lr, 3)} is above the limit of ${fmt(cap, 3)} for this slope.` : "The learning rate is too large for this landscape.",
    };
  }
  if (state.status === "lost") {
    return { tone: "warn", headline: "Out of steps.", detail: `Loss is ${fmt(loss, 3)}; the goal was ${level.mode === "loss" ? `under ${level.target}` : "a flat spot"}. Adjust and reset.` };
  }

  // Still running: describe what these settings will do.
  if (cap !== null && lr > cap) {
    return { tone: "bad", headline: `Past the limit of ${fmt(cap, 3)}: this will diverge.`, detail: "Each step overshoots by more than it gains, so the loss grows." };
  }
  const c = level.landscape.curvatures;
  if (c && momentum === 0) {
    const factors = c.map((k) => 1 - lr * k);
    const worst = factors.reduce((a, b) => (Math.abs(b) > Math.abs(a) ? b : a));
    if (c.length === 1) {
      const f = factors[0]!;
      if (f < 0) return { tone: "warn", headline: "Bouncing across the minimum.", detail: `Each step multiplies the position by ${fmt(f)}: the sign flips every step.` };
      return { tone: lr < 0.1 * (cap ?? 1) ? "warn" : "info", headline: lr < 0.1 * (cap ?? 1) ? "Creeping: this is slow." : "Heading downhill.", detail: `Each step multiplies the position by ${fmt(f)}.` };
    }
    return {
      tone: worst < 0 ? "warn" : "info",
      headline: worst < 0 ? "Zig-zagging across the steep walls." : "Heading down the valley.",
      detail: `Per step the axes shrink by ${factors.map((f) => fmt(f)).join(" and ")}. The steep axis limits the learning rate, so the gentle axis is slow.`,
    };
  }
  if (momentum > 0) return { tone: "info", headline: "Momentum is carrying the ball.", detail: "It builds speed along the valley floor and damps the zig-zag." };
  return { tone: "info", headline: "Ready.", detail: "Choose a learning rate and press Step or Run." };
}

/* ------------------------------------------------------------ solvability */

/** The learning-rate grid used for solvability checks (log-spaced across the slider). */
export function lrGrid(n = 80): number[] {
  return Array.from({ length: n }, (_, i) => LR_MIN * Math.pow(LR_MAX / LR_MIN, i / (n - 1)));
}

export function momentumGrid(): number[] {
  return Array.from({ length: 20 }, (_, i) => Math.round(i * 5) / 100);
}

/** Every (lr, momentum) pair on the grids that wins the level. */
export function winningSettings(level: Level): { lr: number; momentum: number }[] {
  const betas = level.momentumAvailable ? momentumGrid() : [0];
  const wins: { lr: number; momentum: number }[] = [];
  for (const lr of lrGrid()) {
    for (const momentum of betas) {
      if (runToEnd(level, initialState(level), lr, momentum).status === "won") wins.push({ lr, momentum });
    }
  }
  return wins;
}

/* ------------------------------------------------------------------- boss */

const BOSS_MIN_WINNING_SETTINGS = 12;

function bossFrom(a: number, b: number, start: [number, number]): Level {
  return {
    id: 5, title: "Boss: the random ravine",
    goal: "A new landscape every seed. Tune learning rate and momentum to get the loss under 0.5 within 8 steps.",
    landscape: quadratic([a, b]), start, budget: 8, mode: "loss", target: 0.5, momentumAvailable: true,
  };
}

/**
 * A seeded boss landscape. Each candidate is checked: it must be winnable with
 * momentum (at least 12 settings on the grids) but NOT winnable with plain
 * gradient descent, so the boss always rewards what the levels taught. If no
 * candidate passes after many tries, a known good ravine is used.
 */
export function bossLevel(seed: number | string): Level {
  const rng = new Rng(`${seed}:boss`);
  for (let attempt = 0; attempt < 60; attempt++) {
    const a = Math.round(rng.range(1, 2.5) * 10) / 10;
    const b = Math.round(rng.range(12, 25) * 10) / 10;
    const sign = rng.chance(0.5) ? 1 : -1;
    const start: [number, number] = [sign * Math.round(rng.range(5, 10) * 10) / 10, rng.pick([-1, 1]) * Math.round(rng.range(2, 5) * 10) / 10];
    const level = bossFrom(a, b, start);
    const wins = winningSettings(level);
    const plainWins = wins.some((w) => w.momentum === 0);
    if (wins.length >= BOSS_MIN_WINNING_SETTINGS && !plainWins) return level;
  }
  return bossFrom(1, 15, [8, 3]);
}

/** Look up a level; `seed` shapes levels 4 and 5. */
export function getLevel(id: LevelId, seed: number | string = 1): Level {
  if (id === 4) return twoBasinLevel(seed);
  if (id === 5) return bossLevel(seed);
  return makeLevel(id);
}

/* ----------------------------------------------------------- slider maths */

export const SLIDER_STEPS = 1000;

/** Learning-rate slider position (0 to 1000) to a rate, on a log scale so small and large rates both get room. */
export function lrFromSlider(position: number): number {
  const t = Math.min(1, Math.max(0, position / SLIDER_STEPS));
  return LR_MIN * Math.pow(LR_MAX / LR_MIN, t);
}

/** Inverse of lrFromSlider. */
export function sliderFromLr(lr: number): number {
  const clamped = Math.min(LR_MAX, Math.max(LR_MIN, lr));
  return Math.round((Math.log(clamped / LR_MIN) / Math.log(LR_MAX / LR_MIN)) * SLIDER_STEPS);
}
