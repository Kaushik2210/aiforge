import { describe, expect, it } from "vitest";
import { makeRng, hashString } from "./rng";
import { sampleIndex, shapeDistribution, softmax, topK, topP } from "./sampling";

const sum = (a: number[]) => a.reduce((x, y) => x + y, 0);

describe("softmax", () => {
  it("sums to 1 and orders like the logits", () => {
    const p = softmax([1, 2, 3]);
    expect(sum(p)).toBeCloseTo(1, 12);
    expect(p[2]!).toBeGreaterThan(p[1]!);
    expect(p[1]!).toBeGreaterThan(p[0]!);
  });
  it("matches a hand-computed value", () => {
    // softmax([0, ln 3]) = [1/4, 3/4]
    const p = softmax([0, Math.log(3)]);
    expect(p[0]!).toBeCloseTo(0.25, 12);
    expect(p[1]!).toBeCloseTo(0.75, 12);
  });
  it("does not overflow on huge logits", () => {
    const p = softmax([1000, 1001]);
    expect(p.every(Number.isFinite)).toBe(true);
    expect(sum(p)).toBeCloseTo(1, 12);
  });
  it("low temperature sharpens, high temperature flattens", () => {
    const logits = [1, 2, 3];
    expect(softmax(logits, 0.1)[2]!).toBeGreaterThan(softmax(logits, 1)[2]!);
    expect(softmax(logits, 10)[2]!).toBeLessThan(softmax(logits, 1)[2]!);
  });
  it("temperature 0 is greedy and breaks ties to the lowest index", () => {
    expect(softmax([1, 5, 5, 2], 0)).toEqual([0, 1, 0, 0]);
  });
  it("rejects bad input", () => {
    expect(() => softmax([])).toThrow(RangeError);
    expect(() => softmax([1], -1)).toThrow(RangeError);
    expect(() => softmax([1], Number.NaN)).toThrow(RangeError);
  });
});

describe("topK", () => {
  it("keeps exactly the k largest and renormalises", () => {
    const p = topK([0.5, 0.3, 0.15, 0.05], 2);
    expect(p[2]!).toBe(0);
    expect(p[3]!).toBe(0);
    expect(p[0]!).toBeCloseTo(0.5 / 0.8, 12);
    expect(sum(p)).toBeCloseTo(1, 12);
  });
  it("k larger than the vocabulary changes nothing", () => {
    const base = [0.2, 0.8];
    const p = topK(base, 10);
    expect(p[0]!).toBeCloseTo(0.2, 12);
    expect(p[1]!).toBeCloseTo(0.8, 12);
  });
  it("rejects k < 1", () => {
    expect(() => topK([1], 0)).toThrow(RangeError);
  });
});

describe("topP", () => {
  it("keeps the smallest set reaching p", () => {
    const p = topP([0.5, 0.3, 0.15, 0.05], 0.7);
    // 0.5 alone is short of 0.7; 0.5 + 0.3 = 0.8 reaches it.
    expect(p[2]!).toBe(0);
    expect(p[3]!).toBe(0);
    expect(p[0]!).toBeCloseTo(0.5 / 0.8, 12);
  });
  it("stops when p is hit exactly rather than adding another token", () => {
    const p = topP([0.5, 0.3, 0.2], 0.8);
    expect(p[2]!).toBe(0);
  });
  it("p = 1 keeps everything", () => {
    const p = topP([0.5, 0.3, 0.2], 1);
    expect(p.every((x) => x > 0)).toBe(true);
  });
  it("always keeps at least the top token, even for a tiny p", () => {
    expect(topP([0.1, 0.6, 0.3], 0.01)).toEqual([0, 1, 0]);
  });
  it("rejects p outside (0, 1]", () => {
    expect(() => topP([1], 0)).toThrow(RangeError);
    expect(() => topP([1], 1.1)).toThrow(RangeError);
  });
});

describe("sampleIndex and shapeDistribution", () => {
  it("follows the cumulative distribution", () => {
    const p = [0.2, 0.5, 0.3];
    expect(sampleIndex(p, 0.0)).toBe(0);
    expect(sampleIndex(p, 0.19)).toBe(0);
    expect(sampleIndex(p, 0.2)).toBe(1);
    expect(sampleIndex(p, 0.69)).toBe(1);
    expect(sampleIndex(p, 0.7)).toBe(2);
    expect(sampleIndex(p, 0.9999999)).toBe(2);
  });
  it("never returns a zero-probability token, even at the rounding edge", () => {
    expect(sampleIndex([0.5, 0.5, 0], 0.99999999999)).toBe(1);
  });
  it("empirical frequencies approach the probabilities with a seeded rng", () => {
    const p = shapeDistribution([0, Math.log(3)]);
    const rng = makeRng(42);
    let hits = 0;
    const n = 20000;
    for (let i = 0; i < n; i++) if (sampleIndex(p, rng()) === 1) hits++;
    expect(hits / n).toBeGreaterThan(0.73);
    expect(hits / n).toBeLessThan(0.77);
  });
  it("applies temperature, then top-k, then top-p", () => {
    const p = shapeDistribution([3, 2, 1, 0], { temperature: 1, topK: 3, topP: 0.5 });
    expect(p[0]!).toBe(1); // after top-k the leader holds more than 0.5, so top-p keeps only it
  });
});

describe("rng", () => {
  it("is reproducible and stays in [0, 1)", () => {
    const a = makeRng(7);
    const b = makeRng(7);
    for (let i = 0; i < 100; i++) {
      const x = a();
      expect(x).toBe(b());
      expect(x).toBeGreaterThanOrEqual(0);
      expect(x).toBeLessThan(1);
    }
  });
  it("different seeds differ, and the hash is stable", () => {
    expect(makeRng(1)()).not.toBe(makeRng(2)());
    expect(hashString("aiforge")).toBe(hashString("aiforge"));
    expect(hashString("a")).not.toBe(hashString("b"));
  });
});
