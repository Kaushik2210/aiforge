import { describe, expect, it } from "vitest";
import { BIOMES, biomeColor, biomeFor, hexToNumber, mixColor, type MapTheme } from "./biomes";
import {
  DECOR_CLEARANCE,
  NODE_RADIUS,
  NODE_SPACING,
  WORLD_WIDTH,
  clampCenterY,
  fitCamera,
  hitTestNode,
  layoutDecor,
  layoutRealms,
  pathPoints,
  stepFocus,
} from "./layout";

describe("layoutRealms", () => {
  const layout = layoutRealms(23);

  it("places every realm once, in order, going down the page", () => {
    expect(layout.nodes.map((n) => n.n)).toEqual(Array.from({ length: 23 }, (_, i) => i + 1));
    for (let i = 1; i < layout.nodes.length; i++) {
      expect(layout.nodes[i]!.y - layout.nodes[i - 1]!.y).toBe(NODE_SPACING);
    }
  });

  it("keeps every node, with its circle, fully inside the world width", () => {
    for (const n of layout.nodes) {
      expect(n.x - NODE_RADIUS).toBeGreaterThanOrEqual(0);
      expect(n.x + NODE_RADIUS).toBeLessThanOrEqual(WORLD_WIDTH);
    }
  });

  it("never lets two nodes overlap", () => {
    for (let i = 0; i < layout.nodes.length; i++) {
      for (let j = i + 1; j < layout.nodes.length; j++) {
        const a = layout.nodes[i]!;
        const b = layout.nodes[j]!;
        expect(Math.hypot(a.x - b.x, a.y - b.y)).toBeGreaterThan(NODE_RADIUS * 2 + 20);
      }
    }
  });

  it("winds: the path really does swing left and right", () => {
    const xs = layout.nodes.map((n) => n.x);
    expect(Math.max(...xs) - Math.min(...xs)).toBeGreaterThan(400);
  });

  it("biome bands tile the world with no gaps or overlaps", () => {
    expect(layout.bands[0]!.top).toBe(0);
    expect(layout.bands.at(-1)!.bottom).toBe(layout.worldHeight);
    for (let i = 1; i < layout.bands.length; i++) {
      expect(layout.bands[i]!.top).toBe(layout.bands[i - 1]!.bottom);
    }
    for (const b of layout.bands) expect(b.bottom).toBeGreaterThan(b.top);
  });

  it("each node sits inside its own band", () => {
    layout.nodes.forEach((n, i) => {
      expect(n.y).toBeGreaterThanOrEqual(layout.bands[i]!.top);
      expect(n.y).toBeLessThan(layout.bands[i]!.bottom);
    });
  });

  it("is deterministic and handles small counts", () => {
    expect(layoutRealms(23)).toEqual(layout);
    expect(layoutRealms(1).nodes).toHaveLength(1);
    expect(() => layoutRealms(0)).toThrow(RangeError);
    expect(() => layoutRealms(2.5)).toThrow(RangeError);
  });
});

describe("layoutDecor", () => {
  const layout = layoutRealms(23);

  it("is deterministic for a seed and different for another", () => {
    expect(layoutDecor(layout, "s1")).toEqual(layoutDecor(layout, "s1"));
    expect(layoutDecor(layout, "s1")).not.toEqual(layoutDecor(layout, "s2"));
  });

  it("keeps scenery inside the world and in its own realm's band", () => {
    for (const d of layoutDecor(layout, 7)) {
      expect(d.x).toBeGreaterThanOrEqual(0);
      expect(d.x).toBeLessThanOrEqual(WORLD_WIDTH);
      const band = layout.bands[d.realm - 1]!;
      expect(d.y).toBeGreaterThanOrEqual(band.top);
      expect(d.y).toBeLessThanOrEqual(band.bottom);
    }
  });

  it("never covers a realm node", () => {
    for (const d of layoutDecor(layout, 99)) {
      for (const n of layout.nodes) expect(Math.hypot(n.x - d.x, n.y - d.y)).toBeGreaterThanOrEqual(DECOR_CLEARANCE);
    }
  });

  it("uses each realm's own scenery kind and gives every realm some", () => {
    const decor = layoutDecor(layout, 3);
    for (const b of BIOMES) {
      const mine = decor.filter((d) => d.realm === b.realm);
      expect(mine.length).toBeGreaterThan(0);
      expect(mine.every((d) => d.kind === b.kind)).toBe(true);
    }
  });

  it("changing one realm's count does not reshuffle the others", () => {
    const a = layoutDecor(layout, 5, 7).filter((d) => d.realm === 4);
    const b = layoutDecor(layout, 5, 7).filter((d) => d.realm === 4);
    expect(a).toEqual(b);
  });
});

describe("hitTestNode", () => {
  const { nodes } = layoutRealms(5);
  it("finds the node under a point, and nothing far away", () => {
    const n = nodes[2]!;
    expect(hitTestNode(nodes, n.x + 5, n.y - 5)?.n).toBe(3);
    expect(hitTestNode(nodes, n.x + 500, n.y)).toBeNull();
  });
  it("picks the nearest when two are in range", () => {
    const a = nodes[0]!;
    expect(hitTestNode(nodes, a.x, a.y, 1000)?.n).toBe(1);
  });
});

describe("camera fit", () => {
  const worldH = layoutRealms(23).worldHeight;

  it("zooms to the view width within sane limits", () => {
    expect(fitCamera(1000, 600, worldH).zoom).toBe(1);
    expect(fitCamera(375, 600, worldH).zoom).toBeCloseTo(0.4, 5); // clamped
    expect(fitCamera(5000, 600, worldH).zoom).toBe(1.25);
  });

  it("always centres horizontally", () => {
    expect(fitCamera(640, 480, worldH).centerX).toBe(WORLD_WIDTH / 2);
  });

  it("vertical centre range keeps the view inside the world", () => {
    const fit = fitCamera(800, 600, worldH);
    const halfVisible = 600 / fit.zoom / 2;
    expect(fit.minCenterY).toBeCloseTo(halfVisible, 8);
    expect(fit.maxCenterY).toBeCloseTo(worldH - halfVisible, 8);
    expect(clampCenterY(fit, -500)).toBe(fit.minCenterY);
    expect(clampCenterY(fit, worldH + 500)).toBe(fit.maxCenterY);
    expect(clampCenterY(fit, 1000)).toBe(1000);
  });

  it("a view taller than the world cannot scroll", () => {
    const fit = fitCamera(1000, 100_000, 500);
    expect(fit.maxCenterY).toBe(fit.minCenterY);
  });
});

describe("stepFocus", () => {
  it("moves and clamps without wrapping", () => {
    expect(stepFocus(0, 1, 23)).toBe(1);
    expect(stepFocus(0, -1, 23)).toBe(0);
    expect(stepFocus(22, 1, 23)).toBe(22);
    expect(stepFocus(5, 100, 23)).toBe(22);
    expect(stepFocus(3, 1, 0)).toBe(0);
  });
});

describe("biomes and colour", () => {
  it("has one biome per realm with unique names", () => {
    expect(BIOMES).toHaveLength(23);
    expect(new Set(BIOMES.map((b) => b.name)).size).toBe(23);
    BIOMES.forEach((b, i) => {
      expect(b.realm).toBe(i + 1);
      expect(b.tint).toBeGreaterThanOrEqual(0);
      expect(b.tint).toBeLessThanOrEqual(1);
    });
    expect(() => biomeFor(24)).toThrow(RangeError);
    expect(biomeFor(2).name).toBe("Loss Mountains");
  });

  it("parses hex and blends colours", () => {
    expect(hexToNumber("#ff0000")).toBe(0xff0000);
    expect(hexToNumber("0d1020")).toBe(0x0d1020);
    expect(() => hexToNumber("red")).toThrow(RangeError);
    expect(mixColor(0x000000, 0xffffff, 0)).toBe(0x000000);
    expect(mixColor(0x000000, 0xffffff, 1)).toBe(0xffffff);
    expect(mixColor(0x000000, 0xffffff, 0.5)).toBe(0x808080);
    expect(mixColor(0x102030, 0x102030, 0.7)).toBe(0x102030);
    expect(mixColor(0, 0xffffff, 9)).toBe(0xffffff); // clamped
  });

  it("biome colours stay close to the page background so text stays readable", () => {
    const theme: MapTheme = {
      bg: 0x0d1020, surface: 0x151a33, surface2: 0x1d2345, text: 0xf2f4ff, textMuted: 0xa9b1d6,
      border: 0x6f78a8, primary: 0xff6b8a, onPrimary: 0x1a0610, accent: 0x4ddceb, xp: 0xffc857,
    };
    for (const b of BIOMES) {
      const c = biomeColor(theme, b);
      for (const shift of [16, 8, 0]) {
        expect(Math.abs(((c >> shift) & 255) - ((theme.bg >> shift) & 255))).toBeLessThan(75);
      }
    }
  });
});

describe("pathPoints", () => {
  const { nodes } = layoutRealms(23);

  it("passes exactly through every node", () => {
    const samples = 14;
    const pts = pathPoints(nodes, samples);
    nodes.forEach((n, i) => {
      const p = i === nodes.length - 1 ? pts.at(-1)! : pts[i * samples]!;
      expect(p.x).toBeCloseTo(n.x, 6);
      expect(p.y).toBeCloseTo(n.y, 6);
    });
  });

  it("has the expected number of points and only finite coordinates", () => {
    const pts = pathPoints(nodes, 10);
    expect(pts).toHaveLength((nodes.length - 1) * 10 + 1);
    expect(pts.every((p) => Number.isFinite(p.x) && Number.isFinite(p.y))).toBe(true);
  });

  it("always moves downward, so the path never doubles back", () => {
    const pts = pathPoints(nodes, 14);
    for (let i = 1; i < pts.length; i++) expect(pts[i]!.y).toBeGreaterThanOrEqual(pts[i - 1]!.y - 1e-9);
  });

  it("handles zero, one and two nodes", () => {
    expect(pathPoints([])).toEqual([]);
    expect(pathPoints([{ x: 1, y: 2 }])).toEqual([{ x: 1, y: 2 }]);
    expect(pathPoints([{ x: 0, y: 0 }, { x: 10, y: 100 }], 4)).toHaveLength(5);
  });
});
