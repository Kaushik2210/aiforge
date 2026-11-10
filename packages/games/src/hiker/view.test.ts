import { describe, expect, it } from "vitest";
import { LEVEL_IDS, getLevel } from "./logic";
import { contours, curve1D, makeProjector, markerShape, overshot, viewBounds } from "./view";

describe("viewBounds", () => {
  it("always contains the start point and is non-degenerate", () => {
    for (const id of LEVEL_IDS) {
      for (const seed of [1, 2, 3]) {
        const level = getLevel(id, seed);
        const b = viewBounds(level);
        expect(b.xMax).toBeGreaterThan(b.xMin);
        expect(b.yMax).toBeGreaterThan(b.yMin);
        expect(level.start[0]!).toBeGreaterThanOrEqual(b.xMin);
        expect(level.start[0]!).toBeLessThanOrEqual(b.xMax);
        if (level.landscape.dims === 2) {
          expect(level.start[1]!).toBeGreaterThanOrEqual(b.yMin);
          expect(level.start[1]!).toBeLessThanOrEqual(b.yMax);
        }
      }
    }
  });

  it("level 1 shows the lesson's parabola from x = 10 with room to overshoot", () => {
    const b = viewBounds(getLevel(1));
    expect(b.xMax).toBeGreaterThan(11);
  });
});

describe("curve1D", () => {
  it("samples the loss and clips to the top of the view", () => {
    const level = getLevel(1);
    const b = viewBounds(level);
    const pts = curve1D(level, b, 100);
    expect(pts).toHaveLength(101);
    expect(pts[0]!.x).toBeCloseTo(b.xMin, 10);
    expect(pts.at(-1)!.x).toBeCloseTo(b.xMax, 10);
    for (const p of pts) expect(p.y).toBeLessThanOrEqual(b.yMax);
    const mid = pts[50]!;
    expect(mid.y).toBeCloseTo(level.landscape.loss([mid.x]), 8);
  });
});

describe("contours", () => {
  const level = getLevel(3);

  it("each ellipse really is a level set of the loss", () => {
    for (const e of contours(level, 6)) {
      expect(level.landscape.loss([e.rx, 0])).toBeCloseTo(e.loss, 8);
      expect(level.landscape.loss([0, e.ry])).toBeCloseTo(e.loss, 8);
    }
  });

  it("goes from the start's own loss inward and is narrower along the steep axis", () => {
    const es = contours(level, 6);
    expect(es[0]!.loss).toBeCloseTo(level.landscape.loss(level.start), 8);
    for (let i = 1; i < es.length; i++) expect(es[i]!.loss).toBeLessThan(es[i - 1]!.loss);
    for (const e of es) expect(e.ry).toBeLessThan(e.rx); // curvature 10 on y vs 1 on x
  });

  it("is empty for one-dimensional levels", () => {
    expect(contours(getLevel(1))).toEqual([]);
  });
});

describe("makeProjector", () => {
  const bounds = { xMin: -10, xMax: 10, yMin: 0, yMax: 100 };
  const p = makeProjector(bounds, { width: 420, height: 320, margin: 10 });

  it("maps the corners inside the margin and flips y", () => {
    expect(p.x(-10)).toBe(10);
    expect(p.x(10)).toBe(410);
    expect(p.y(0)).toBe(310); // bottom
    expect(p.y(100)).toBe(10); // top
  });

  it("is monotonic: bigger x goes right, bigger loss goes up", () => {
    expect(p.x(1)).toBeGreaterThan(p.x(0));
    expect(p.y(50)).toBeLessThan(p.y(10));
  });

  it("scale matches the mapping", () => {
    expect(p.x(1) - p.x(0)).toBeCloseTo(p.scaleX, 10);
    expect(p.y(0) - p.y(1)).toBeCloseTo(p.scaleY, 10);
  });
});

describe("markers and overshoot", () => {
  it("cycles circle, triangle, square", () => {
    expect([0, 1, 2, 3, 4].map(markerShape)).toEqual(["circle", "triangle", "square", "circle", "triangle"]);
    expect(markerShape(-1)).toBe("square");
  });

  it("detects a growing loss", () => {
    expect(overshot([100, 50])).toBe(false);
    expect(overshot([50, 100])).toBe(true);
    expect(overshot([5])).toBe(false);
    expect(overshot([])).toBe(false);
  });
});
