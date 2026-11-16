import { describe, expect, it } from "vitest";
import { rainFrame, rng, scrambleFrame, skylineFrame } from "./ascii-fx";

describe("scrambleFrame", () => {
  it("is the target at the end, noise-free", () => {
    expect(scrambleFrame("Level up", 1)).toBe("Level up");
    expect(scrambleFrame("Level up", 5)).toBe("Level up");
  });
  it("keeps length and spaces, and settles left to right", () => {
    const f = scrambleFrame("Level up now", 0.5, 3);
    expect(f).toHaveLength(12);
    expect(f[5]).toBe(" ");
    expect(f.slice(0, 6)).toBe("Level ");
  });
  it("survives bad progress", () => {
    expect(scrambleFrame("ab", Number.NaN)).toHaveLength(2);
    expect(scrambleFrame("ab", -3)).toHaveLength(2);
  });
  it("is deterministic", () => {
    expect(scrambleFrame("hello world", 0.3, 9)).toBe(scrambleFrame("hello world", 0.3, 9));
  });
});

describe("rainFrame", () => {
  it("has the requested size and is deterministic", () => {
    const a = rainFrame(30, 10, 2.5);
    expect(a).toHaveLength(10);
    for (const row of a) expect(row).toHaveLength(30);
    expect(a).toEqual(rainFrame(30, 10, 2.5));
  });
  it("moves with time and never draws outside the grid", () => {
    expect(rainFrame(30, 10, 0)).not.toEqual(rainFrame(30, 10, 3));
    expect(rainFrame(0, 0, 1)).toHaveLength(1);
  });
});

describe("skylineFrame", () => {
  it("has equal-length rows, a sun and ground", () => {
    const rows = skylineFrame(60, 16, 0);
    expect(rows).toHaveLength(16);
    for (const row of rows) expect(row).toHaveLength(60);
    expect(rows.join("")).toContain("O");
    expect(rows.at(-1)!).toContain("#");
  });
  it("drifts over time", () => {
    expect(skylineFrame(60, 16, 0)).not.toEqual(skylineFrame(60, 16, 5));
  });
});

describe("rng", () => {
  it("is in [0, 1) and repeatable", () => {
    const a = rng(5);
    const b = rng(5);
    for (let i = 0; i < 20; i++) {
      const v = a();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
      expect(v).toBe(b());
    }
  });
});
