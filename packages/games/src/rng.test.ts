import { describe, expect, it } from "vitest";
import { Rng, hashSeed } from "./rng";

const take = (r: Rng, n: number) => Array.from({ length: n }, () => r.next());

describe("Rng", () => {
  it("is deterministic: the same seed gives the same sequence", () => {
    expect(take(new Rng(42), 50)).toEqual(take(new Rng(42), 50));
    expect(take(new Rng("daily-2026-11-10"), 20)).toEqual(take(new Rng("daily-2026-11-10"), 20));
  });

  it("different seeds give different sequences", () => {
    expect(take(new Rng(1), 10)).not.toEqual(take(new Rng(2), 10));
    expect(take(new Rng("a"), 10)).not.toEqual(take(new Rng("b"), 10));
  });

  it("next() stays in [0, 1)", () => {
    const r = new Rng(7);
    for (let i = 0; i < 10_000; i++) {
      const v = r.next();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });

  it("is roughly uniform", () => {
    const r = new Rng(123);
    const buckets = Array<number>(10).fill(0);
    const n = 20_000;
    for (let i = 0; i < n; i++) buckets[Math.floor(r.next() * 10)]!++;
    for (const b of buckets) expect(Math.abs(b - n / 10)).toBeLessThan(n * 0.02);
  });

  it("int() includes both ends and nothing outside", () => {
    const r = new Rng(5);
    const seen = new Set<number>();
    for (let i = 0; i < 2_000; i++) {
      const v = r.int(3, 6);
      expect(Number.isInteger(v)).toBe(true);
      expect(v).toBeGreaterThanOrEqual(3);
      expect(v).toBeLessThanOrEqual(6);
      seen.add(v);
    }
    expect([...seen].sort()).toEqual([3, 4, 5, 6]);
  });

  it("int() handles a single-value range and rejects bad ranges", () => {
    expect(new Rng(1).int(4, 4)).toBe(4);
    expect(() => new Rng(1).int(5, 2)).toThrow(RangeError);
    expect(() => new Rng(1).int(1.5, 3)).toThrow(RangeError);
  });

  it("range() stays within bounds", () => {
    const r = new Rng(9);
    for (let i = 0; i < 1_000; i++) {
      const v = r.range(-2, 5);
      expect(v).toBeGreaterThanOrEqual(-2);
      expect(v).toBeLessThan(5);
    }
  });

  it("pick() returns an element and rejects an empty list", () => {
    const items = ["a", "b", "c"];
    const r = new Rng(3);
    for (let i = 0; i < 50; i++) expect(items).toContain(r.pick(items));
    expect(() => r.pick([])).toThrow(RangeError);
  });

  it("shuffle() is a permutation, leaves the input alone and is repeatable", () => {
    const input = [1, 2, 3, 4, 5, 6, 7, 8];
    const copy = [...input];
    const a = new Rng(11).shuffle(input);
    expect(input).toEqual(copy);
    expect([...a].sort((x, y) => x - y)).toEqual(copy);
    expect(new Rng(11).shuffle(input)).toEqual(a);
    expect(new Rng(12).shuffle(input)).not.toEqual(a);
  });

  it("chance() respects 0 and 1", () => {
    const r = new Rng(2);
    for (let i = 0; i < 200; i++) {
      expect(r.chance(0)).toBe(false);
      expect(r.chance(1)).toBe(true);
    }
  });

  it("fork() gives independent but repeatable sub-generators", () => {
    const a = new Rng(10).fork("decor");
    const b = new Rng(10).fork("decor");
    const c = new Rng(10).fork("other");
    expect(take(a, 5)).toEqual(take(b, 5));
    expect(take(new Rng(10).fork("decor"), 5)).not.toEqual(take(c, 5));
  });
});

describe("hashSeed", () => {
  it("is stable and distinguishes inputs", () => {
    expect(hashSeed("abc")).toBe(hashSeed("abc"));
    expect(hashSeed("abc")).not.toBe(hashSeed("abd"));
    expect(hashSeed("")).toBeGreaterThanOrEqual(0);
  });
});
