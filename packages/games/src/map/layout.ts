import { Rng } from "../rng";
import { BIOMES, type DecorKind } from "./biomes";

/**
 * Pure geometry for the world map: where each realm sits on a winding path and
 * where scenery goes. No Phaser here, so it is fully unit-testable. World
 * coordinates: x runs 0..WORLD_WIDTH, y runs down the page.
 */

export const WORLD_WIDTH = 1000;
export const NODE_RADIUS = 34;
export const NODE_SPACING = 200;
const TOP_PADDING = 140;
const BOTTOM_PADDING = 160;
const AMPLITUDE = 280;

export interface NodePos {
  /** Realm number, 1-based. */
  n: number;
  x: number;
  y: number;
}

export interface Layout {
  nodes: NodePos[];
  worldHeight: number;
  /** y range of each realm's biome band (top inclusive, bottom exclusive). */
  bands: { n: number; top: number; bottom: number }[];
}

export function layoutRealms(count: number): Layout {
  if (!Number.isInteger(count) || count < 1) throw new RangeError("count must be a positive integer");
  const nodes: NodePos[] = [];
  for (let i = 0; i < count; i++) {
    nodes.push({
      n: i + 1,
      // A gentle S-curve; the phase offset starts the path near the centre.
      x: Math.round(WORLD_WIDTH / 2 + AMPLITUDE * Math.sin(i * 0.95)),
      y: TOP_PADDING + i * NODE_SPACING,
    });
  }
  const worldHeight = TOP_PADDING + (count - 1) * NODE_SPACING + BOTTOM_PADDING;
  const bands = nodes.map((node, i) => {
    const prev = nodes[i - 1];
    const next = nodes[i + 1];
    return {
      n: node.n,
      top: prev ? Math.round((prev.y + node.y) / 2) : 0,
      bottom: next ? Math.round((node.y + next.y) / 2) : worldHeight,
    };
  });
  return { nodes, worldHeight, bands };
}

export interface Decor {
  kind: DecorKind;
  x: number;
  y: number;
  /** Rough size in world units. */
  size: number;
  realm: number;
}

/** Keep scenery this far from any realm node so it never covers one. */
export const DECOR_CLEARANCE = NODE_RADIUS + 46;

/**
 * Scenery for the whole map. Deterministic for a seed; each realm uses its own
 * forked generator, so adding or changing one realm never reshuffles the others.
 */
export function layoutDecor(layout: Layout, seed: number | string, perRealm = 7): Decor[] {
  const root = new Rng(seed);
  const out: Decor[] = [];
  for (const band of layout.bands) {
    const biome = BIOMES[band.n - 1];
    if (!biome) continue;
    const rng = root.fork(`realm-${band.n}`);
    let placed = 0;
    let attempts = 0;
    while (placed < perRealm && attempts < perRealm * 12) {
      attempts++;
      // Round first, then check: the clearance must hold for the position we actually use.
      const x = Math.round(rng.range(30, WORLD_WIDTH - 30));
      const y = Math.round(rng.range(band.top + 20, band.bottom - 20));
      const tooClose = layout.nodes.some((node) => Math.hypot(node.x - x, node.y - y) < DECOR_CLEARANCE);
      if (tooClose) continue;
      out.push({ kind: biome.kind, x, y, size: Math.round(rng.range(26, 62)), realm: band.n });
      placed++;
    }
  }
  return out;
}

/** The realm whose node is closest to a world point, if within `radius`. */
export function hitTestNode(nodes: readonly NodePos[], x: number, y: number, radius = NODE_RADIUS + 8): NodePos | null {
  let best: NodePos | null = null;
  let bestD = radius;
  for (const node of nodes) {
    const d = Math.hypot(node.x - x, node.y - y);
    if (d <= bestD) {
      best = node;
      bestD = d;
    }
  }
  return best;
}

export interface Fit {
  zoom: number;
  /** World x the camera is centred on (the map is always centred horizontally). */
  centerX: number;
  /** Smallest and largest allowed camera-centre y at this zoom. */
  minCenterY: number;
  maxCenterY: number;
}

/**
 * Zoom so the map is as wide as the view (within limits). Phaser zooms a camera
 * around its centre, so the camera is positioned by its centre point, not by
 * scroll: the visible height in world units is viewH / zoom, and the centre can
 * move between half of that and (world height - half of that).
 */
export function fitCamera(viewW: number, viewH: number, worldH: number): Fit {
  const zoom = Math.min(1.25, Math.max(0.4, viewW / WORLD_WIDTH));
  const half = viewH / zoom / 2;
  const minCenterY = half;
  return { zoom, centerX: WORLD_WIDTH / 2, minCenterY, maxCenterY: Math.max(minCenterY, worldH - half) };
}

export function clampCenterY(fit: Fit, y: number): number {
  return Math.min(fit.maxCenterY, Math.max(fit.minCenterY, y));
}

/** Next focus index when moving through realms with the keyboard (clamped, not wrapping). */
export function stepFocus(current: number, delta: number, count: number): number {
  if (count < 1) return 0;
  return Math.min(count - 1, Math.max(0, current + delta));
}

export interface Pt {
  x: number;
  y: number;
}

/**
 * Smooth curve through the realm nodes (Catmull-Rom spline), sampled into
 * points for drawing. The curve passes exactly through every node.
 */
export function pathPoints(nodes: readonly Pt[], samplesPerSegment = 14): Pt[] {
  if (nodes.length === 0) return [];
  if (nodes.length === 1) return [{ x: nodes[0]!.x, y: nodes[0]!.y }];
  const pts: Pt[] = [];
  for (let i = 0; i < nodes.length - 1; i++) {
    const p0 = nodes[Math.max(0, i - 1)]!;
    const p1 = nodes[i]!;
    const p2 = nodes[i + 1]!;
    const p3 = nodes[Math.min(nodes.length - 1, i + 2)]!;
    for (let s = 0; s < samplesPerSegment; s++) {
      const t = s / samplesPerSegment;
      const t2 = t * t;
      const t3 = t2 * t;
      const cr = (a: number, b: number, c: number, d: number) =>
        0.5 * (2 * b + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t2 + (-a + 3 * b - 3 * c + d) * t3);
      pts.push({ x: cr(p0.x, p1.x, p2.x, p3.x), y: cr(p0.y, p1.y, p2.y, p3.y) });
    }
  }
  const last = nodes[nodes.length - 1]!;
  pts.push({ x: last.x, y: last.y });
  return pts;
}
