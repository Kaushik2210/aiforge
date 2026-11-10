import { describe, expect, it } from "vitest";
import { areaPath, axisAngle, linePath, linearScale, niceMax, radarPoint, radarPolygon, ticks } from "./chart-geometry";

describe("linearScale", () => {
  it("maps the ends and the middle", () => {
    const s = linearScale(0, 100, 10, 210);
    expect([s(0), s(50), s(100)]).toEqual([10, 110, 210]);
  });
  it("handles an inverted range (for SVG y) and a flat domain", () => {
    const y = linearScale(0, 10, 100, 0);
    expect(y(0)).toBe(100);
    expect(y(10)).toBe(0);
    expect(linearScale(5, 5, 0, 100)(5)).toBe(50);
  });
});

describe("niceMax", () => {
  it("rounds up to 1, 2 or 5 times a power of ten and never below the value", () => {
    expect([0.9, 1, 3, 7, 12, 99, 101, 640, 1001].map(niceMax)).toEqual([1, 1, 5, 10, 20, 100, 200, 1000, 2000]);
    for (const v of [1, 4, 17, 230, 4999, 12345]) expect(niceMax(v)).toBeGreaterThanOrEqual(v);
  });
  it("falls back to 10 for zero, negative or junk", () => {
    expect([0, -4, NaN, Infinity].map(niceMax)).toEqual([10, 10, 10, 10]);
  });
});

describe("linePath and areaPath", () => {
  it("draws a polyline", () => {
    expect(linePath([{ x: 0, y: 10 }, { x: 5, y: 20 }, { x: 10, y: 5 }])).toBe("M 0 10 L 5 20 L 10 5");
  });
  it("lifts the pen over unknown stretches instead of joining across them", () => {
    expect(linePath([{ x: 0, y: 1 }, null, { x: 2, y: 3 }, { x: 3, y: 4 }])).toBe("M 0 1 M 2 3 L 3 4");
  });
  it("is empty for no points", () => {
    expect(linePath([])).toBe("");
    expect(areaPath([], 100)).toBe("");
  });
  it("closes the area down to the baseline", () => {
    expect(areaPath([{ x: 0, y: 10 }, { x: 10, y: 20 }], 50)).toBe("M 0 10 L 10 20 L 10 50 L 0 50 Z");
  });
});

describe("radar", () => {
  it("puts axis 0 straight up and goes clockwise", () => {
    expect(axisAngle(0, 4)).toBeCloseTo(-Math.PI / 2, 12);
    const top = radarPoint(100, 0, 4, 100, 100, 50);
    const right = radarPoint(100, 1, 4, 100, 100, 50);
    expect(top).toEqual({ x: 100, y: 50 });
    expect(right).toEqual({ x: 150, y: 100 });
  });
  it("scales with the value and clamps to the chart", () => {
    expect(radarPoint(50, 0, 4, 100, 100, 50)).toEqual({ x: 100, y: 75 });
    expect(radarPoint(0, 2, 4, 100, 100, 50)).toEqual({ x: 100, y: 100 });
    expect(radarPoint(900, 0, 4, 100, 100, 50)).toEqual({ x: 100, y: 50 });
    expect(radarPoint(-5, 0, 4, 100, 100, 50)).toEqual({ x: 100, y: 100 });
    expect(radarPoint(NaN, 0, 4, 100, 100, 50)).toEqual({ x: 100, y: 100 });
  });
  it("builds a polygon string with one point per value", () => {
    const poly = radarPolygon([100, 100, 100, 100], 100, 100, 50).split(" ");
    expect(poly).toEqual(["100,50", "150,100", "100,150", "50,100"]);
  });
  it("every point stays within the radius of the centre", () => {
    for (let n = 3; n <= 12; n++) {
      for (let i = 0; i < n; i++) {
        const p = radarPoint(100, i, n, 0, 0, 80);
        expect(Math.hypot(p.x, p.y)).toBeLessThanOrEqual(80.01);
      }
    }
  });
});

describe("ticks", () => {
  it("gives evenly spaced whole-number ticks", () => {
    expect(ticks(200, 4)).toEqual([0, 50, 100, 150, 200]);
    expect(ticks(10, 2)).toEqual([0, 5, 10]);
  });
});
