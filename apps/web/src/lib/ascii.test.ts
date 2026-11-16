import { describe, expect, it } from "vitest";
import { asciiBar } from "./ascii";

describe("asciiBar", () => {
  it("fills in proportion to the value", () => {
    expect(asciiBar(0, 100)).toBe("[----------]");
    expect(asciiBar(50, 100)).toBe("[#####-----]");
    expect(asciiBar(100, 100)).toBe("[##########]");
  });

  it("is only full when the value reaches the maximum", () => {
    expect(asciiBar(99, 100)).toBe("[#########-]");
    expect(asciiBar(99.9, 100)).toBe("[#########-]");
    expect(asciiBar(100.1, 100)).toBe("[##########]");
  });

  it("shows at least one cell for any progress above zero", () => {
    expect(asciiBar(1, 1000)).toBe("[#---------]");
    expect(asciiBar(0.0001, 1)).toBe("[#---------]");
  });

  it("always has the requested number of cells", () => {
    for (const v of [0, 1, 7, 33, 50, 99, 100, 500]) {
      expect(asciiBar(v, 100, 16)).toHaveLength(18);
      expect(asciiBar(v, 100, 3)).toHaveLength(5);
    }
  });

  it("clamps negative and over-full values", () => {
    expect(asciiBar(-5, 100)).toBe("[----------]");
    expect(asciiBar(500, 100)).toBe("[##########]");
  });

  it("treats a bad maximum or a non-finite number as an empty bar", () => {
    for (const bad of [Number.NaN, Infinity, -Infinity]) {
      expect(asciiBar(bad, 100)).toBe("[----------]");
    }
    expect(asciiBar(10, 0)).toBe("[----------]");
    expect(asciiBar(10, -4)).toBe("[----------]");
    expect(asciiBar(10, Number.NaN)).toBe("[----------]");
  });

  it("keeps the width sensible", () => {
    expect(asciiBar(5, 10, 0)).toHaveLength(3);
    expect(asciiBar(5, 10, 1000)).toHaveLength(62);
    expect(asciiBar(5, 10, Number.NaN)).toHaveLength(12);
  });

  it("is monotonic: more progress never shows fewer cells", () => {
    let last = -1;
    for (let v = 0; v <= 100; v += 1) {
      const cells = (asciiBar(v, 100, 20).match(/#/g) ?? []).length;
      expect(cells).toBeGreaterThanOrEqual(last);
      last = cells;
    }
  });
});
