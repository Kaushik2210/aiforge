/**
 * Pure drawing for the ASCII look: scrambling text, falling code rain and an
 * ASCII skyline. Everything is a function of (size, time, seed) so it can be
 * tested without a browser or a clock. The components decide whether anything may
 * move at all (reduced motion, Focus mode, effects level, a Pause button).
 */

/** A small deterministic generator (mulberry32). */
export function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const clamp01 = (n: number) => (Number.isFinite(n) ? Math.min(1, Math.max(0, n)) : 0);

export const SCRAMBLE_GLYPHS = "!<>-_\/[]{}=+*^?#%&";

/**
 * The text at `progress` (0 to 1) of a scramble: characters settle left to right and
 * the rest are noise. Spaces and line breaks never change, and at 1 it is exactly the target.
 */
export function scrambleFrame(target: string, progress: number, seed = 1): string {
  const p = clamp01(progress);
  if (p >= 1) return target;
  const chars = [...target];
  const settled = Math.floor(p * chars.length);
  const rand = rng(seed + Math.floor(p * 40));
  return chars
    .map((ch, i) => (i < settled || /\s/.test(ch) ? ch : SCRAMBLE_GLYPHS[Math.floor(rand() * SCRAMBLE_GLYPHS.length)]!))
    .join("");
}

export const RAIN_GLYPHS = "01<>/\{}[]=+*:;";

/** Rows of falling code rain at time `t` seconds. Same inputs, same picture. */
export function rainFrame(cols: number, rows: number, t: number, seed = 7): string[] {
  const c = Math.max(1, Math.floor(cols));
  const r = Math.max(1, Math.floor(rows));
  const grid = Array.from({ length: r }, () => Array.from({ length: c }, () => " "));
  for (let x = 0; x < c; x++) {
    const rand = rng(seed * 7919 + x * 104729);
    const speed = 2 + rand() * 5;
    const length = 3 + Math.floor(rand() * 7);
    const offset = rand() * (r + length);
    const head = Math.floor((offset + t * speed) % (r + length));
    for (let k = 0; k < length; k++) {
      const y = head - k;
      if (y >= 0 && y < r) grid[y]![x] = k === 0 ? "@" : RAIN_GLYPHS[Math.floor(rng(x * 31 + y + Math.floor(t * 2))() * RAIN_GLYPHS.length)]!;
    }
  }
  return grid.map((row) => row.join(""));
}

/**
 * An ASCII skyline: a sun, three ridges that drift at different speeds, and stars.
 * Heavier glyphs are nearer. Rows are equal length.
 */
export function skylineFrame(cols: number, rows: number, t: number): string[] {
  const c = Math.max(8, Math.floor(cols));
  const r = Math.max(6, Math.floor(rows));
  const grid = Array.from({ length: r }, () => Array.from({ length: c }, () => " "));
  const stars = rng(11);
  for (let i = 0; i < Math.floor((c * r) / 40); i++) {
    const x = Math.floor(stars() * c);
    const y = Math.floor(stars() * r * 0.5);
    grid[y]![x] = (i + Math.floor(t * 1.5)) % 3 === 0 ? "+" : ".";
  }
  const sunX = Math.floor(c * 0.78);
  const sunY = Math.floor(r * 0.28);
  for (let y = -1; y <= 1; y++) for (let x = -3; x <= 3; x++) if (x * x / 9 + y * y <= 1.1) grid[sunY + y]![sunX + x] = "O";
  const ridge = (base: number, amp: number, freq: number, speed: number, glyph: string) => {
    for (let x = 0; x < c; x++) {
      const h = base + amp * Math.sin((x + t * speed) * freq) + (amp / 2) * Math.sin((x + t * speed) * freq * 2.3);
      for (let y = Math.max(0, Math.round(h)); y < r; y++) grid[y]![x] = glyph;
    }
  };
  ridge(r * 0.5, r * 0.12, 0.09, 0.4, ".");
  ridge(r * 0.64, r * 0.1, 0.13, 0.9, ":");
  ridge(r * 0.8, r * 0.07, 0.21, 1.6, "#");
  return grid.map((row) => row.join(""));
}
