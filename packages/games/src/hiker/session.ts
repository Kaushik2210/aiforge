import { TypedEmitter } from "../events";
import type { GameResult } from "../types";
import {
  LR_MAX,
  LR_MIN,
  MOMENTUM_MAX,
  feedback,
  getLevel,
  inGlobalBasin,
  initialState,
  maxStableLr,
  runToEnd,
  scoreFor,
  step,
  type Feedback,
  type HikerState,
  type Level,
  type LevelId,
} from "./logic";

export interface HikerSnapshot {
  level: Level;
  state: HikerState;
  lr: number;
  momentum: number;
  feedback: Feedback;
  /** The largest stable learning rate for the current momentum, if known. */
  cap: number | null;
  score: number;
}

export interface HikerResult extends GameResult {
  levelId: LevelId;
  /** Level 4: settled in the deeper valley. */
  deeperValley: boolean;
}

export interface HikerEvents {
  change: HikerSnapshot;
  /** Once per play-through, when it reaches a win, a loss or a divergence. */
  complete: HikerResult;
}

export interface SessionOptions {
  levelId?: LevelId;
  seed?: number | string;
  /** Injectable clock so durations are testable. */
  now?: () => number;
}

const DEFAULT_LR = 0.1;
const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));

/**
 * One player's play-through. Holds the level, the ball, and the two sliders,
 * and tells listeners (the Phaser scene, the React controls, the accessible
 * table) whenever anything changes. All the rules live in logic.ts.
 */
export class HikerSession {
  readonly events = new TypedEmitter<HikerEvents>();

  private baseSeed: number | string;
  private reseeds = 0;
  private level: Level;
  private state: HikerState;
  private lr = DEFAULT_LR;
  private momentum = 0;
  private startedAt: number | null = null;
  private reported = false;
  private readonly now: () => number;

  constructor(opts: SessionOptions = {}) {
    this.now = opts.now ?? (() => Date.now());
    this.baseSeed = opts.seed ?? 1;
    this.level = getLevel(opts.levelId ?? 1, this.seed());
    this.state = initialState(this.level);
  }

  private seed(): string {
    return `${this.baseSeed}:${this.reseeds}`;
  }

  get snapshot(): HikerSnapshot {
    return {
      level: this.level,
      state: this.state,
      lr: this.lr,
      momentum: this.momentum,
      feedback: feedback(this.level, this.state, this.lr, this.momentum),
      cap: maxStableLr(this.level, this.momentum),
      score: scoreFor(this.level, this.state),
    };
  }

  private changed() {
    this.events.emit("change", this.snapshot);
  }

  private maybeComplete() {
    if (this.reported || this.state.status === "running") return;
    this.reported = true;
    this.events.emit("complete", {
      levelId: this.level.id,
      won: this.state.status === "won",
      score: scoreFor(this.level, this.state),
      durationMs: Math.max(0, this.now() - (this.startedAt ?? this.now())),
      deeperValley: inGlobalBasin(this.level, this.state),
    });
  }

  setLr(lr: number) {
    if (!Number.isFinite(lr)) return;
    this.lr = clamp(lr, LR_MIN, LR_MAX);
    this.changed();
  }

  setMomentum(momentum: number) {
    if (!Number.isFinite(momentum)) return;
    this.momentum = this.level.momentumAvailable ? clamp(momentum, 0, MOMENTUM_MAX) : 0;
    this.changed();
  }

  /** One step with the current sliders. */
  step() {
    if (this.state.status !== "running") return;
    this.startedAt ??= this.now();
    this.state = step(this.level, this.state, this.lr, this.momentum);
    this.changed();
    this.maybeComplete();
  }

  /** Keep stepping with the current sliders until the run ends. */
  run() {
    if (this.state.status !== "running") return;
    this.startedAt ??= this.now();
    this.state = runToEnd(this.level, this.state, this.lr, this.momentum);
    this.changed();
    this.maybeComplete();
  }

  /** Back to the start of the same level, same landscape. */
  reset() {
    this.state = initialState(this.level);
    this.startedAt = null;
    this.reported = false;
    this.changed();
  }

  /** A different landscape for levels 4 and 5 (a no-op reset for 1 to 3). */
  reseed() {
    this.reseeds++;
    this.level = getLevel(this.level.id, this.seed());
    this.reset();
  }

  setLevel(id: LevelId) {
    this.level = getLevel(id, this.seed());
    this.lr = DEFAULT_LR;
    this.momentum = 0;
    this.reset();
  }

  dispose() {
    this.events.clear();
  }
}
