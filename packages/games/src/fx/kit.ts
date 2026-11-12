import { clamp01, easeOutCubic } from "./ease";
import { speedLines, type Segment, type SpeedLineSpec } from "./lines";
import { DEFAULT_FX_MODE, MAX_HIT_STOP_MS, effectiveLevel, strength, type FxLevel, type FxMode } from "./mode";
import { decayTrauma, shakeOffset } from "./shake";

export interface Shockwave {
  x: number;
  y: number;
  radius: number;
  /** 1 at the start, 0 when finished. */
  alpha: number;
  /** True under reduced motion: the ring does not grow, it only fades. */
  still: boolean;
}

/** Everything a renderer needs to draw one frame of effects. */
export interface FxFrame {
  /** Multiply the game's own time by this: 0 while a hit-stop freeze is running, otherwise 1. */
  timeScale: number;
  /** Camera offset in pixels. */
  shake: { x: number; y: number };
  /** Camera zoom, 1 when idle. */
  zoom: number;
  lines: Segment[];
  lineAlpha: number;
  shockwaves: Shockwave[];
  /** True while anything is animating, so a renderer can skip redraws when idle. */
  active: boolean;
}

/** A fresh idle frame each time, so a caller changing one cannot affect the next. */
const idle = (): FxFrame => ({ timeScale: 1, shake: { x: 0, y: 0 }, zoom: 1, lines: [], lineAlpha: 0, shockwaves: [], active: false });

const isFinite_ = (n: unknown): n is number => typeof n === "number" && Number.isFinite(n);

/** No effect runs longer than this, so an Infinity or a typo cannot hold one on screen forever. */
const MAX_EFFECT_MS = 5000;
const MAX_LINES = 200;
const MAX_RING_SIZE = 2000;

/** The longest frame step we trust, so a background tab cannot skip an effect in one jump. */
const MAX_STEP_MS = 100;

/**
 * Game-feel effects as plain state, with no drawing and no Phaser: ask for an
 * effect, call `update(dtMs)` once per frame, then draw the returned frame.
 * Because time is passed in, tests can run it with fake time.
 *
 * Effects run on the real clock, not the game's: a hit-stop freezes the game
 * (timeScale 0) while the shake, zoom and lines keep playing.
 *
 * Accessibility: with reduced motion every effect is a no-op except a ring that
 * fades in place. Level 0 turns everything off.
 */
export class FxKit {
  private mode: FxMode;
  private nowMs = 0;
  private freezeMs = 0;
  private trauma = 0;
  private punch: { amount: number; ms: number; t: number } | null = null;
  private lineState: { spec: SpeedLineSpec; ms: number; t: number } | null = null;
  private waves: { x: number; y: number; size: number; ms: number; t: number; still: boolean }[] = [];

  constructor(mode: Partial<FxMode> = {}) {
    this.mode = { ...DEFAULT_FX_MODE, ...mode };
  }

  setMode(mode: Partial<FxMode>): void {
    this.mode = { ...this.mode, ...mode };
    if (effectiveLevel(this.mode) === 0) this.reset();
  }

  get level(): FxLevel {
    return effectiveLevel(this.mode);
  }

  /** Freeze the game for a moment on impact. Capped at MAX_HIT_STOP_MS. */
  hitStop(ms: number): void {
    const s = strength(this.level);
    if (s === 0 || !isFinite_(ms) || !(ms > 0)) return;
    this.freezeMs = Math.max(this.freezeMs, Math.min(MAX_HIT_STOP_MS, ms * s));
  }

  /** Add camera shake. `trauma` is 0 to 1; stacked hits add up to a maximum of 1. */
  screenShake(trauma: number): void {
    const s = strength(this.level);
    if (s === 0 || !isFinite_(trauma) || !(trauma > 0)) return;
    this.trauma = Math.min(1, this.trauma + Math.min(1, trauma) * s);
  }

  /** Zoom in by `amount` (0.05 is 5%) and ease back out over `ms`. */
  zoomPunch(amount: number, ms: number): void {
    const s = strength(this.level);
    if (s === 0 || !isFinite_(amount) || !isFinite_(ms) || !(amount > 0) || !(ms > 0)) return;
    this.punch = { amount: Math.min(0.2, amount * s), ms: Math.min(MAX_EFFECT_MS, ms), t: 0 };
  }

  /** Anime speed lines or radial focus lines for `ms`, redrawn on twos. */
  speedLines(spec: SpeedLineSpec, ms: number): void {
    const s = strength(this.level);
    if (s === 0 || !isFinite_(ms) || !(ms > 0)) return;
    if (![spec.cx, spec.cy, spec.w, spec.h].every(isFinite_)) return;
    const wanted = isFinite_(spec.count) ? spec.count : 14;
    const count = Math.max(0, Math.min(MAX_LINES, Math.round(wanted * Math.min(1, s))));
    this.lineState = { spec: { ...spec, count }, ms: Math.min(MAX_EFFECT_MS, ms), t: 0 };
  }

  /** An expanding ring. Under reduced motion it stays put and only fades. */
  shockwave(x: number, y: number, opts: { size?: number; ms?: number } = {}): void {
    const reduced = this.mode.reducedMotion && this.mode.level > 0;
    if (strength(this.level) === 0 && !reduced) return;
    if (!isFinite_(x) || !isFinite_(y)) return;
    const size = isFinite_(opts.size) && opts.size > 0 ? Math.min(MAX_RING_SIZE, opts.size) : 120;
    const ms = isFinite_(opts.ms) && opts.ms > 0 ? Math.min(MAX_EFFECT_MS, opts.ms) : 600;
    this.waves.push({ x, y, size, ms, t: 0, still: reduced });
    if (this.waves.length > 4) this.waves.shift();
  }

  /** Advance by `dtMs` of real time and return the frame to draw. */
  update(dtMs: number): FxFrame {
    const dt = isFinite_(dtMs) ? Math.min(MAX_STEP_MS, Math.max(0, dtMs)) : 0;
    this.nowMs += dt;

    const frozen = this.freezeMs > 0;
    this.freezeMs = Math.max(0, this.freezeMs - dt);
    this.trauma = decayTrauma(this.trauma, dt);

    let zoom = 1;
    if (this.punch) {
      this.punch.t += dt;
      zoom = 1 + this.punch.amount * (1 - easeOutCubic(this.punch.t / this.punch.ms));
      if (this.punch.t >= this.punch.ms) this.punch = null;
    }

    let lines: Segment[] = [];
    let lineAlpha = 0;
    if (this.lineState) {
      this.lineState.t += dt;
      const p = clamp01(this.lineState.t / this.lineState.ms);
      lineAlpha = 1 - p * p;
      lines = speedLines(this.lineState.spec, this.lineState.t);
      if (this.lineState.t >= this.lineState.ms) this.lineState = null;
    }

    const shockwaves: Shockwave[] = [];
    for (const w of this.waves) {
      w.t += dt;
      const p = clamp01(w.t / w.ms);
      shockwaves.push({ x: w.x, y: w.y, radius: w.still ? w.size * 0.6 : w.size * easeOutCubic(p), alpha: 1 - p, still: w.still });
    }
    this.waves = this.waves.filter((w) => w.t < w.ms);

    const shake = shakeOffset(this.trauma, this.nowMs);
    // The last frame of a line burst or ring still has something to draw, so it counts as active.
    const active =
      frozen || this.trauma > 0 || this.punch !== null || this.lineState !== null || this.waves.length > 0 || lines.length > 0 || shockwaves.length > 0;
    if (!active) return idle();
    return { timeScale: frozen ? 0 : 1, shake, zoom, lines, lineAlpha, shockwaves, active };
  }

  /** Stop everything now. */
  reset(): void {
    this.freezeMs = 0;
    this.trauma = 0;
    this.punch = null;
    this.lineState = null;
    this.waves = [];
  }
}
