/** Small, pure helpers for the dashboard's hand-drawn SVG charts. */

export interface Pt {
  x: number;
  y: number;
}

/** A linear scale from a domain to a range (clamped when the domain is a single value). */
export function linearScale(d0: number, d1: number, r0: number, r1: number): (v: number) => number {
  if (d1 === d0) return () => (r0 + r1) / 2;
  return (v) => r0 + ((v - d0) / (d1 - d0)) * (r1 - r0);
}

/** A "nice" upper bound for an axis: 1, 2, 5 times a power of ten, never below the value. */
export function niceMax(value: number): number {
  if (!Number.isFinite(value) || value <= 0) return 10;
  const exp = Math.floor(Math.log10(value));
  const base = Math.pow(10, exp);
  for (const m of [1, 2, 5, 10]) if (m * base >= value) return m * base;
  return 10 * base;
}

/** SVG path through the points. Points are joined in order; null breaks the line (an unknown stretch). */
export function linePath(points: readonly (Pt | null)[]): string {
  let d = "";
  let pen = false;
  for (const p of points) {
    if (!p) {
      pen = false;
      continue;
    }
    d += `${pen ? "L" : "M"} ${round(p.x)} ${round(p.y)} `;
    pen = true;
  }
  return d.trim();
}

/** Closed path under a line down to a baseline, for the filled area (only the known stretch). */
export function areaPath(points: readonly Pt[], baselineY: number): string {
  if (points.length === 0) return "";
  const first = points[0]!;
  const last = points.at(-1)!;
  return `${linePath(points)} L ${round(last.x)} ${baselineY} L ${round(first.x)} ${baselineY} Z`;
}

const round = (n: number) => Math.round(n * 100) / 100;

/** Angle of axis `i` of `n`, starting at the top and going clockwise. */
export function axisAngle(i: number, n: number): number {
  return -Math.PI / 2 + (i * 2 * Math.PI) / n;
}

/** Radar point for a 0 to 100 value on axis `i`. Values are clamped to the chart. */
export function radarPoint(value: number, i: number, n: number, cx: number, cy: number, radius: number): Pt {
  const r = (Math.min(100, Math.max(0, Number.isFinite(value) ? value : 0)) / 100) * radius;
  const a = axisAngle(i, n);
  return { x: round(cx + Math.cos(a) * r), y: round(cy + Math.sin(a) * r) };
}

/** Polygon points string ("x,y x,y ...") for a radar series. */
export function radarPolygon(values: readonly number[], cx: number, cy: number, radius: number): string {
  return values.map((v, i) => radarPoint(v, i, values.length, cx, cy, radius)).map((p) => `${p.x},${p.y}`).join(" ");
}

/** Evenly spaced tick positions from 0 to max, inclusive. */
export function ticks(max: number, count = 4): number[] {
  return Array.from({ length: count + 1 }, (_, i) => Math.round((max * i) / count));
}
