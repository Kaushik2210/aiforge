import { clamp01, easeOutCubic, heldFrame } from "./ease";
import { FlashLimiter } from "./flash";
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

/** A fading copy of a moving thing, left behind where it just was (an afterimage). */
export interface Ghost {
  x: number;
  y: number;
  /** 0 to 1; the newest ghost is the strongest. */
  alpha: number;
}

/**
 * A smear: for a moment a fast-moving thing is stretched along its direction of
 * travel and squashed across it. A renderer scales its sprite by `along` in the
 * direction of `angle` and by `across` at right angles.
 */
export interface Smear {
  /** Direction of travel, in radians (0 points right). */
  angle: number;
  /** Scale along the direction of travel, 1 or more. */
  along: number;
  /** Scale across it, at most 1. */
  across: number;
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
  /** Afterimages of whatever was passed to `trace`, newest first. */
  ghosts: Ghost[];
  /**
   * Strength of the dark "ink" impact frame, 0 when there is none. It is one hit
   * held for two frames on twos, then gone, and is never white (see ADR 0012).
   */
  impact: number;
  /** The smear to apply to the moving thing this frame, or null. */
  smear: Smear | null;
  /** True while anything is animating, so a renderer can skip redraws when idle. */
  active: boolean;
}

/** A fresh idle frame each time, so a caller changing one cannot affect the next. */
const idle = (): FxFrame => ({ timeScale: 1, shake: { x: 0, y: 0 }, zoom: 1, lines: [], lineAlpha: 0, shockwaves: [], ghosts: [], impact: 0, smear: null, active: false });

const isFinite_ = (n: unknown): n is number => typeof n === "number" && Number.isFinite(n);

/** No effect runs longer than this, so an Infinity or a typo cannot hold one on screen forever. */
const MAX_EFFECT_MS = 5000;
const MAX_LINES = 200;
const MAX_RING_SIZE = 2000;
const MAX_GHOSTS = 4;
const GHOST_LIFE_MS = 240;
/** The most a smear may stretch, however hard a caller asks. */
const MAX_STRETCH = 3;
/** A ghost is only left behind once the thing has moved at least this far (in pixels) from the last one. */
const GHOST_MIN_GAP = 7;
/** The impact frame: two held frames on twos at 24 fps (about 83 ms each), strongest first. */
const IMPACT_ALPHAS = [0.7, 0.35];

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
  private trail: { x: number; y: number; t: number }[] = [];
  private impactT: number | null = null;
  private smearState: { angle: number; stretch: number; ms: number; t: number } | null = null;
  // One impact frame a second at most: it is a full-canvas luminance change, so we keep clear of the WCAG limit of 3.
  private readonly flashes = new FlashLimiter(1);

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

  /**
   * Call every frame with the position of something that moves fast. Afterimages
   * are left behind it while it travels. Off at level 0 and under reduced motion.
   */
  trace(x: number, y: number): void {
    if (strength(this.level) === 0 || !isFinite_(x) || !isFinite_(y)) return;
    const last = this.trail[0];
    if (last && Math.hypot(x - last.x, y - last.y) < GHOST_MIN_GAP) return;
    this.trail.unshift({ x, y, t: this.nowMs });
    if (this.trail.length > MAX_GHOSTS + 1) this.trail.pop();
  }

  /**
   * Stretch a fast mover along `angle` (radians) for `ms` (default 120), easing back
   * to normal. `stretch` is the peak length scale (default 1.8, capped at 3), scaled
   * by the effects level. Off at level 0 and under reduced motion.
   */
  smear(angle: number, opts: { ms?: number; stretch?: number } = {}): void {
    const s = strength(this.level);
    if (s === 0 || !isFinite_(angle)) return;
    const ms = isFinite_(opts.ms) && opts.ms > 0 ? Math.min(MAX_EFFECT_MS, opts.ms) : 120;
    const want = isFinite_(opts.stretch) && opts.stretch > 1 ? opts.stretch : 1.8;
    const stretch = Math.min(MAX_STRETCH, 1 + (want - 1) * s);
    this.smearState = { angle, stretch, ms, t: 0 };
  }

  /**
   * A dark, tinted "ink" frame held for two frames on twos, for the biggest moments
   * only (a boss defeated). Needs level 2 or higher and goes through the flash
   * limiter, so at most 1 can start in any second; returns false when refused.
   */
  impactFrame(): boolean {
    if (this.level < 2) return false;
    if (!this.flashes.tryFlash(this.nowMs)) return false;
    this.impactT = 0;
    return true;
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

    this.trail = this.trail.filter((g) => this.nowMs - g.t < GHOST_LIFE_MS);
    // The newest point is where the thing is now, so ghosts start from the second one.
    const ghosts: Ghost[] = this.trail.slice(1).map((g) => ({ x: g.x, y: g.y, alpha: 0.45 * (1 - (this.nowMs - g.t) / GHOST_LIFE_MS) }));

    let impact = 0;
    if (this.impactT !== null) {
      const held = heldFrame(this.impactT, 2, 24);
      if (held >= IMPACT_ALPHAS.length) {
        this.impactT = null;
      } else {
        impact = IMPACT_ALPHAS[held] ?? 0;
        this.impactT += dt;
      }
    }

    let smear: Smear | null = null;
    if (this.smearState) {
      const k = 1 - easeOutCubic(this.smearState.t / this.smearState.ms);
      const along = 1 + (this.smearState.stretch - 1) * k;
      smear = { angle: this.smearState.angle, along, across: 1 / Math.sqrt(along) };
      this.smearState.t += dt;
      if (this.smearState.t >= this.smearState.ms) this.smearState = null;
    }

    const shake = shakeOffset(this.trauma, this.nowMs);
    // The last frame of a line burst or ring still has something to draw, so it counts as active.
    const active =
      frozen || this.trauma > 0 || this.punch !== null || this.lineState !== null || this.waves.length > 0 || lines.length > 0 || shockwaves.length > 0 || ghosts.length > 0 || impact > 0 || smear !== null;
    if (!active) return idle();
    return { timeScale: frozen ? 0 : 1, shake, zoom, lines, lineAlpha, shockwaves, ghosts, impact, smear, active };
  }

  /** Stop everything now. */
  reset(): void {
    this.freezeMs = 0;
    this.trauma = 0;
    this.punch = null;
    this.lineState = null;
    this.waves = [];
    this.trail = [];
    this.impactT = null;
    this.smearState = null;
  }
}
