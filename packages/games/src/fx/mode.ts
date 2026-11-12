/**
 * How much effect the learner wants. Level 0 is off, 3 is the most dramatic.
 * Reduced motion (the OS setting or Focus mode) always wins over the level.
 */
export type FxLevel = 0 | 1 | 2 | 3;

export interface FxMode {
  level: FxLevel;
  reducedMotion: boolean;
}

export const DEFAULT_FX_MODE: FxMode = { level: 2, reducedMotion: false };

/** The level that actually applies: reduced motion forces 0. */
export function effectiveLevel(mode: FxMode): FxLevel {
  return mode.reducedMotion ? 0 : mode.level;
}

/** Multiplier for effect strength at each level (0 means "do nothing"). */
export function strength(level: FxLevel): number {
  return [0, 0.5, 1, 1.4][level] ?? 0;
}

/** Hit-stop never lasts longer than this, however hard a caller asks. */
export const MAX_HIT_STOP_MS = 150;
