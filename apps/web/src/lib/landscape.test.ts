import { describe, expect, it } from "vitest";
import { START, STEPS, descentPath, gradient, loss, lossRange, pointAt, stepAt } from "./landscape";

describe("loss and gradient", () => {
  it("are finite over the whole drawn area", () => {
    for (let x = -4; x <= 4; x += 0.5) {
      for (let z = -4; z <= 4; z += 0.5) {
        expect(Number.isFinite(loss(x, z))).toBe(true);
        const g = gradient(x, z);
        expect(Number.isFinite(g.x) && Number.isFinite(g.z)).toBe(true);
      }
    }
  });
  it("the numeric gradient points uphill: a small step against it lowers the loss", () => {
    for (const [x, z] of [[-3, 2], [0.2, 0.4], [2, -2], [-1, -1]] as const) {
      const g = gradient(x, z);
      expect(loss(x - 1e-3 * g.x, z - 1e-3 * g.z)).toBeLessThan(loss(x, z));
    }
  });
  it("has a deeper well than shallow well, so the picture shows more than one valley", () => {
    expect(loss(1.5, -0.9)).toBeLessThan(loss(-1.6, 1.2));
  });
});

describe("descentPath", () => {
  const path = descentPath();
  it("has steps + 1 points and starts at the start", () => {
    expect(path).toHaveLength(STEPS + 1);
    expect(path[0]!.x).toBe(START.x);
    expect(path[0]!.z).toBe(START.z);
  });
  it("only ever goes downhill and ends nearly flat", () => {
    for (let i = 1; i < path.length; i++) expect(path[i]!.y).toBeLessThanOrEqual(path[i - 1]!.y + 1e-12);
    const end = path.at(-1)!;
    const g = gradient(end.x, end.z);
    expect(Math.hypot(g.x, g.z)).toBeLessThan(0.02);
    expect(end.y).toBeLessThan(path[0]!.y - 1);
  });
  it("is repeatable and rejects bad settings", () => {
    expect(descentPath()).toEqual(path);
    expect(() => descentPath(START, 0)).toThrow();
    expect(() => descentPath(START, Number.NaN)).toThrow();
    expect(() => descentPath(START, 0.1, 0)).toThrow();
    expect(() => descentPath(START, 0.1, 2.5)).toThrow();
  });
  it("overshoots and blows up with a huge learning rate, which the scene never uses", () => {
    const wild = descentPath(START, 20, 5);
    expect(wild.at(-1)!.y).toBeGreaterThan(path[0]!.y);
  });
});

describe("pointAt and stepAt", () => {
  const path = descentPath(START, 0.42, 10);
  it("hits the ends exactly and blends in between", () => {
    expect(pointAt(path, 0)).toEqual(path[0]);
    expect(pointAt(path, 1)).toEqual(path.at(-1));
    const mid = pointAt(path, 0.05);
    expect(mid.x).toBeCloseTo((path[0]!.x + path[1]!.x) / 2, 9);
  });
  it("clamps and survives bad numbers", () => {
    expect(pointAt(path, -3)).toEqual(path[0]);
    expect(pointAt(path, 9)).toEqual(path.at(-1));
    expect(pointAt(path, Number.NaN)).toEqual(path[0]);
    expect(() => pointAt([], 0.5)).toThrow();
    expect(stepAt(path, 0.5)).toBe(5);
    expect(stepAt(path, 2)).toBe(10);
  });
});

describe("lossRange", () => {
  it("has the lowest value in a well and a clear spread", () => {
    const { min, max } = lossRange();
    expect(min).toBeLessThan(-1);
    expect(max).toBeGreaterThan(min + 1.5);
  });
});
