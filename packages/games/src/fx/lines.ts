import { Rng } from "../rng";
import { heldFrame } from "./ease";

export interface Segment {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  /** Line width in pixels, thicker lines are rarer. */
  width: number;
}

export type LineKind = "radial" | "direction";

export interface SpeedLineSpec {
  kind: LineKind;
  /** Focus point: where radial lines point at, and where direction lines centre. */
  cx: number;
  cy: number;
  /** Area the lines should cover, in pixels. */
  w: number;
  h: number;
  /** Direction lines trail behind motion going this way, in radians (0 = moving right). */
  angle?: number;
  count?: number;
  seed?: string | number;
}

/**
 * Anime speed lines or radial focus lines. They are re-drawn from a new random
 * layout only every `step` frames (default "on twos"), which is what gives the
 * hand-drawn flicker. The same spec, time and step always give the same lines.
 */
export function speedLines(spec: SpeedLineSpec, tMs: number, step = 2, fps = 24): Segment[] {
  const count = spec.count ?? 14;
  const rng = new Rng(`${spec.seed ?? "fx"}:${heldFrame(tMs, step, fps)}`);
  const reach = Math.hypot(spec.w, spec.h) / 2;
  const out: Segment[] = [];

  if (spec.kind === "radial") {
    for (let i = 0; i < count; i++) {
      const a = ((i + rng.next() * 0.8) / count) * Math.PI * 2;
      const inner = reach * (0.35 + rng.next() * 0.25);
      const outer = reach * (0.9 + rng.next() * 0.2);
      out.push({
        x1: spec.cx + Math.cos(a) * inner,
        y1: spec.cy + Math.sin(a) * inner,
        x2: spec.cx + Math.cos(a) * outer,
        y2: spec.cy + Math.sin(a) * outer,
        width: rng.next() < 0.25 ? 4 : 2,
      });
    }
    return out;
  }

  const angle = spec.angle ?? 0;
  const dx = -Math.cos(angle); // lines trail BEHIND the motion
  const dy = -Math.sin(angle);
  const nx = -dy; // a unit vector across the motion
  const ny = dx;
  for (let i = 0; i < count; i++) {
    const across = (rng.next() - 0.5) * Math.min(spec.w, spec.h) * 0.9;
    const start = reach * (0.05 + rng.next() * 0.25);
    const length = reach * (0.25 + rng.next() * 0.45);
    out.push({
      x1: spec.cx + nx * across + dx * start,
      y1: spec.cy + ny * across + dy * start,
      x2: spec.cx + nx * across + dx * (start + length),
      y2: spec.cy + ny * across + dy * (start + length),
      width: rng.next() < 0.25 ? 4 : 2,
    });
  }
  return out;
}
