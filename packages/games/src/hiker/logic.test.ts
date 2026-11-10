import { describe, expect, it } from "vitest";
import {
  LEVEL_IDS,
  MOMENTUM_MAX,
  bossLevel,
  feedback,
  getLevel,
  inGlobalBasin,
  initialState,
  lrGrid,
  maxStableLr,
  momentumGrid,
  runToEnd,
  scoreFor,
  step,
  winningSettings,
  type Level,
} from "./logic";

const L = (id: 1 | 2 | 3 | 4 | 5, seed: number | string = 1) => getLevel(id, seed);

/** Same level but run for many steps with no goal, to observe long-run behaviour. */
const endless = (level: Level): Level => ({ ...level, budget: 3000, target: -1, mode: "loss" });

describe("levels", () => {
  it("has five levels with matching ids and sensible settings", () => {
    expect(LEVEL_IDS).toEqual([1, 2, 3, 4, 5]);
    for (const id of LEVEL_IDS) {
      const level = L(id);
      expect(level.id).toBe(id);
      expect(level.budget).toBeGreaterThan(0);
      expect(level.start).toHaveLength(level.landscape.dims);
      expect(level.goal.length).toBeGreaterThan(20);
    }
  });

  it("momentum is offered from level 3 on, not before", () => {
    expect([1, 2, 3, 4, 5].map((id) => L(id as 1).momentumAvailable)).toEqual([false, false, true, true, true]);
  });
});

describe("the update rule is the lesson's rule", () => {
  const l1 = L(1);

  it("level 1 is f(x) = x^2 from x = 10 with gradient 2x", () => {
    expect(l1.start).toEqual([10]);
    expect(l1.landscape.grad([3])).toEqual([6]);
    expect(l1.landscape.loss([3])).toBe(9);
  });

  it("reproduces the lesson's worked numbers (lr 0.2 shrinks x by 0.6 each step)", () => {
    const s = runToEnd(l1, initialState(l1), 0.2);
    for (let n = 0; n < s.trail.length; n++) expect(s.trail[n]![0]).toBeCloseTo(10 * 0.6 ** n, 9);
  });

  it("lr 0.05 after 10 steps is 3.486784401, and the run is lost", () => {
    const s = runToEnd(l1, initialState(l1), 0.05);
    expect(s.steps).toBe(10);
    expect(s.pos[0]).toBeCloseTo(3.486784401, 8);
    expect(s.status).toBe("lost");
  });

  it("lr 1.1 grows to 61.917364224 after 10 steps; lr 1.0 bounces forever between 10 and -10", () => {
    expect(runToEnd(l1, initialState(l1), 1.1).pos[0]).toBeCloseTo(61.917364224, 6);
    expect(runToEnd(l1, initialState(l1), 1).trail.map((p) => p[0])).toEqual([10, -10, 10, -10, 10, -10, 10, -10, 10, -10, 10]);
  });

  it("momentum 0 is plain gradient descent, and the heavy-ball update is v' = b*v - lr*g, x' = x + v'", () => {
    const l3 = L(3);
    const s0 = initialState(l3);
    const plain = step(l3, s0, 0.1, 0);
    expect(plain.pos[0]).toBeCloseTo(8 - 0.1 * 8, 12);
    expect(plain.pos[1]).toBeCloseTo(3 - 0.1 * 30, 12);
    const s1 = step(l3, s0, 0.1, 0.5);
    const s2 = step(l3, s1, 0.1, 0.5);
    const g = l3.landscape.grad(s1.pos);
    expect(s2.vel[0]).toBeCloseTo(0.5 * s1.vel[0]! - 0.1 * g[0]!, 12);
    expect(s2.pos[0]).toBeCloseTo(s1.pos[0]! + s2.vel[0]!, 12);
  });

  it("levels without momentum ignore a momentum setting", () => {
    const a = runToEnd(l1, initialState(l1), 0.3, 0);
    const b = runToEnd(l1, initialState(l1), 0.3, 0.9);
    expect(b.trail).toEqual(a.trail);
  });
});

describe("step is pure and the run ends cleanly", () => {
  const l1 = L(1);

  it("never mutates its input", () => {
    const s0 = initialState(l1);
    const snapshot = JSON.stringify(s0);
    step(l1, s0, 0.2);
    expect(JSON.stringify(s0)).toBe(snapshot);
  });

  it("does nothing once the run is won, lost or diverged", () => {
    const won = runToEnd(l1, initialState(l1), 0.5);
    expect(won.status).toBe("won");
    expect(step(l1, won, 0.5)).toBe(won);
    const lost = runToEnd(l1, initialState(l1), 0.01);
    expect(lost.status).toBe("lost");
    expect(step(l1, lost, 0.2)).toBe(lost);
  });

  it("landing exactly on the target counts as a win (the goal is inclusive)", () => {
    // lr 0.5 puts x at exactly 0, so the loss is exactly 0 = the target.
    const exact = { ...l1, target: 0 };
    const s = runToEnd(exact, initialState(exact), 0.5);
    expect(s.losses.at(-1)).toBe(0);
    expect(s.status).toBe("won");
    expect(s.wonAtStep).toBe(1);
  });

  it("wins on the first step whose loss is under the target, and records it", () => {
    const s = runToEnd(l1, initialState(l1), 0.5); // x -> 0 in one step
    expect(s.status).toBe("won");
    expect(s.wonAtStep).toBe(1);
    expect(s.steps).toBe(1);
  });

  it("flags a runaway as diverged instead of overflowing", () => {
    const big = { ...l1, budget: 200 };
    const s = runToEnd(big, initialState(big), 1.9);
    expect(s.status).toBe("diverged");
    expect(Number.isFinite(s.losses.at(-1)!)).toBe(true);
  });

  it("trail and losses always have one entry per step plus the start", () => {
    for (const lr of [0.05, 0.2, 0.9, 1.5]) {
      const s = runToEnd(l1, initialState(l1), lr);
      expect(s.trail).toHaveLength(s.steps + 1);
      expect(s.losses).toHaveLength(s.steps + 1);
    }
  });
});

describe("level 1 and 2: a fair window of winning learning rates", () => {
  const wins = (level: Level, lr: number) => runToEnd(level, initialState(level), lr).status === "won";

  it("level 1 wins in the middle, loses when too slow, bouncing or diverging", () => {
    for (const lr of [0.13, 0.2, 0.5, 0.8]) expect(wins(L(1), lr), `lr ${lr}`).toBe(true);
    for (const lr of [0.01, 0.05, 0.9, 1, 1.1, 1.5]) expect(wins(L(1), lr), `lr ${lr}`).toBe(false);
  });

  it("level 1 window matches the measured range (about 0.12 to 0.88)", () => {
    const w = winningSettings(L(1)).map((s) => s.lr);
    expect(Math.min(...w)).toBeGreaterThan(0.1);
    expect(Math.min(...w)).toBeLessThan(0.14);
    expect(Math.max(...w)).toBeGreaterThan(0.8);
    expect(Math.max(...w)).toBeLessThan(0.9);
  });

  it("level 2 wins well below its 2/L limit of 0.4, and the limit is shown", () => {
    expect(maxStableLr(L(2))).toBeCloseTo(0.4, 12);
    for (const lr of [0.06, 0.2, 0.3]) expect(wins(L(2), lr), `lr ${lr}`).toBe(true);
    for (const lr of [0.01, 0.45, 0.8]) expect(wins(L(2), lr), `lr ${lr}`).toBe(false);
  });
});

describe("level 3: the valley needs momentum", () => {
  const l3 = L(3);

  it("no plain gradient descent learning rate can win", () => {
    for (const lr of lrGrid(200)) {
      expect(runToEnd(l3, initialState(l3), lr, 0).status, `lr ${lr}`).not.toBe("won");
    }
  });

  it("but a good share of momentum settings do", () => {
    const wins = winningSettings(l3);
    expect(wins.length).toBeGreaterThan(100);
    expect(wins.every((w) => w.momentum > 0)).toBe(true);
  });

  it("a known good setting wins (lr 0.16, momentum 0.5)", () => {
    expect(runToEnd(l3, initialState(l3), 0.16, 0.5).status).toBe("won");
  });
});

describe("the stability limit 2(1+b)/curvature, checked against real runs", () => {
  const cases: [string, 1 | 2 | 3][] = [["level 1", 1], ["level 2", 2], ["level 3", 3]];

  it.each(cases)("%s: just under the limit converges, just over it diverges", (_n, id) => {
    const level = endless(L(id));
    const betas = level.momentumAvailable ? [0, 0.3, 0.6, 0.9] : [0];
    for (const beta of betas) {
      const cap = maxStableLr(level, beta)!;
      const below = runToEnd(level, initialState(level), cap * 0.95, beta);
      const above = runToEnd(level, initialState(level), cap * 1.05, beta);
      expect(below.status, `${_n} beta ${beta} below`).not.toBe("diverged");
      expect(below.losses.at(-1)!, `${_n} beta ${beta}`).toBeLessThan(below.losses[0]!);
      expect(above.status, `${_n} beta ${beta} above`).toBe("diverged");
    }
  });

  it("is null where there is no single curvature (level 4)", () => {
    expect(maxStableLr(L(4))).toBeNull();
  });

  it("momentum raises the limit by the factor (1 + b)", () => {
    expect(maxStableLr(L(3), 0.5)! / maxStableLr(L(3), 0)!).toBeCloseTo(1.5, 12);
  });
});

describe("level 4: two valleys", () => {
  it("the starting side comes from the seed, and both sides occur", () => {
    const sides = new Set<number>();
    for (let seed = 0; seed < 60; seed++) {
      const a = L(4, seed);
      expect(L(4, seed).start).toEqual(a.start);
      sides.add(Math.sign(a.start[0]!));
      expect(Math.abs(a.start[0]!)).toBeGreaterThanOrEqual(2.6);
      expect(Math.abs(a.start[0]!)).toBeLessThanOrEqual(3.4);
    }
    expect([...sides].sort()).toEqual([-1, 1]);
  });

  it("the left valley really is deeper than the right one", () => {
    const f = L(4).landscape;
    const grad = (x: number) => f.grad([x])[0]!;
    const find = (x0: number) => { let x = x0; for (let i = 0; i < 5000; i++) x -= 0.01 * grad(x); return x; };
    const left = find(-3);
    const right = find(3);
    expect(left).toBeLessThan(-2);
    expect(right).toBeGreaterThan(1.5);
    expect(f.loss([left])).toBeLessThan(f.loss([right]));
  });

  it("is solvable from every seed: some learning rate settles in a valley", () => {
    for (let seed = 0; seed < 40; seed++) {
      expect(winningSettings(L(4, seed)).length, `seed ${seed}`).toBeGreaterThan(5);
    }
  });

  it("a small learning rate settles in the nearest valley", () => {
    for (const seed of [0, 1, 2, 3, 4, 5]) {
      const level = L(4, seed);
      const s = runToEnd(level, initialState(level), 0.04);
      expect(s.status).toBe("won");
      expect(Math.sign(s.pos[0]!)).toBe(Math.sign(level.start[0]!));
    }
  });

  it("scores the deeper valley higher than the shallow one", () => {
    const level = L(4, 0);
    const fake = (x: number, at: number) => ({ ...initialState(level), pos: [x], status: "won" as const, wonAtStep: at });
    expect(scoreFor(level, fake(-2.1, 10))).toBeGreaterThan(scoreFor(level, fake(1.9, 10)));
    expect(inGlobalBasin(level, fake(-2.1, 10))).toBe(true);
    expect(inGlobalBasin(level, fake(1.9, 10))).toBe(false);
  });
});

describe("level 5: the boss", () => {
  it("is deterministic for a seed and varies between seeds", () => {
    const a = bossLevel("s1");
    expect(bossLevel("s1").landscape.curvatures).toEqual(a.landscape.curvatures);
    expect(bossLevel("s1").start).toEqual(a.start);
    const shapes = new Set(Array.from({ length: 20 }, (_, i) => String(bossLevel(`seed-${i}`).landscape.curvatures)));
    expect(shapes.size).toBeGreaterThan(10);
  });

  it("every seed is fair: winnable with momentum, never with plain steps", () => {
    for (let i = 0; i < 80; i++) {
      const level = bossLevel(`boss-${i}`);
      const wins = winningSettings(level);
      expect(wins.length, `seed ${i}`).toBeGreaterThanOrEqual(12);
      expect(wins.some((w) => w.momentum === 0), `seed ${i} plain`).toBe(false);
    }
  });

  it("the generator almost never needs its fallback ravine", () => {
    let fallback = 0;
    for (let i = 0; i < 200; i++) {
      const c = bossLevel(`f-${i}`).landscape.curvatures!;
      if (c[0] === 1 && c[1] === 15) fallback++;
    }
    expect(fallback).toBeLessThan(10);
  });
});

describe("score", () => {
  it("is 0 unless the player won, faster is better, and always within 0.1 to 1", () => {
    const l1 = L(1);
    expect(scoreFor(l1, runToEnd(l1, initialState(l1), 0.01))).toBe(0);
    const fast = runToEnd(l1, initialState(l1), 0.5);
    const slow = runToEnd(l1, initialState(l1), 0.13);
    expect(fast.status).toBe("won");
    expect(slow.status).toBe("won");
    expect(scoreFor(l1, fast)).toBeGreaterThan(scoreFor(l1, slow));
    for (const s of [fast, slow]) {
      expect(scoreFor(l1, s)).toBeGreaterThanOrEqual(0.1);
      expect(scoreFor(l1, s)).toBeLessThanOrEqual(1);
    }
  });
});

describe("feedback", () => {
  it("tells the player the per-step factor on level 1", () => {
    const l1 = L(1);
    const f = feedback(l1, initialState(l1), 0.2);
    expect(f.detail).toContain("0.60");
  });

  it("warns about the limit before the player presses Run", () => {
    const l1 = L(1);
    const f = feedback(l1, initialState(l1), 1.3);
    expect(f.tone).toBe("bad");
    expect(f.headline).toMatch(/limit of 1\.000/);
  });

  it("explains a sign-flipping learning rate as bouncing", () => {
    const l1 = L(1);
    expect(feedback(l1, initialState(l1), 0.8).headline).toMatch(/Bouncing/);
  });

  it("explains the narrow valley with both axis factors and why it is slow", () => {
    const l3 = L(3);
    const f = feedback(l3, initialState(l3), 0.15);
    expect(f.detail).toContain("0.85");
    expect(f.detail).toContain("-0.50");
    expect(f.detail).toMatch(/steep axis/);
  });

  it("reports win, loss and divergence", () => {
    const l1 = L(1);
    expect(feedback(l1, runToEnd(l1, initialState(l1), 0.5), 0.5).headline).toMatch(/Converged in 1 step\./);
    expect(feedback(l1, runToEnd(l1, initialState(l1), 0.01), 0.01).headline).toBe("Out of steps.");
    const big = { ...l1, budget: 200 };
    expect(feedback(big, runToEnd(big, initialState(big), 1.9), 1.9).headline).toMatch(/Diverging/);
  });
});

describe("grids", () => {
  it("cover the slider ranges", () => {
    const g = lrGrid();
    expect(g[0]).toBeCloseTo(0.005, 10);
    expect(g.at(-1)).toBeCloseTo(2, 10);
    expect(momentumGrid()[0]).toBe(0);
    expect(momentumGrid().at(-1)).toBe(MOMENTUM_MAX);
  });
});
