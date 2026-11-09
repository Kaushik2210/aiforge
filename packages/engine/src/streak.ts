import { addDays, dayDiff, isDateKey, isValidTimeZone, localDateKey, type DateKey } from "./dates";

/**
 * Streak rules (spec in the project brief):
 * - A day counts when the learner does at least one lesson step or a review
 *   session of 5+ cards. The caller decides that; this engine only records "the
 *   learner was active at this instant".
 * - A day is the learner's LOCAL calendar day. We store the exact instant of the
 *   last activity and recompute its local day in whatever zone the learner is in
 *   now, so travel and daylight saving cannot create or lose a day.
 * - A freeze is earned every 7 consecutive days, at most 2 are held, and they
 *   apply automatically to missed days, but only when they cover the whole gap.
 * - Returning after a break gives a small XP bonus, not a scolding. The longest
 *   streak is never reduced.
 */

export const FREEZE_EVERY = 7;
export const MAX_FREEZES = 2;
export const COMEBACK_BONUS_XP = 25;

export interface StreakState {
  version: 1;
  /** Days practised in the current run (frozen days protect the run but are not counted). */
  current: number;
  longest: number;
  freezes: number;
  /** Instant (epoch ms) of the most recent counted activity; source of truth. */
  lastActiveAt: number | null;
  /** That instant's local day in `zone`, kept for readability and exports. */
  lastActiveDay: DateKey | null;
  /** IANA zone the learner was in at the last activity. */
  zone: string;
  /** Every day that counted, sorted, unique. Feeds the heatmap. */
  activeDays: DateKey[];
}

export type StreakEvent =
  | { type: "started" }
  | { type: "already-counted" }
  | { type: "extended"; current: number }
  | { type: "freeze-earned"; freezes: number }
  | { type: "freeze-used"; days: DateKey[]; remaining: number }
  | { type: "broken"; previous: number }
  | { type: "comeback"; daysAway: number; bonusXp: number }
  | { type: "zone-changed"; from: string; to: string }
  | { type: "clock-went-backwards" };

export interface RecordResult {
  state: StreakState;
  events: StreakEvent[];
}

export function newStreakState(zone: string): StreakState {
  if (!isValidTimeZone(zone)) throw new RangeError(`invalid time zone: ${zone}`);
  return {
    version: 1,
    current: 0,
    longest: 0,
    freezes: 0,
    lastActiveAt: null,
    lastActiveDay: null,
    zone,
    activeDays: [],
  };
}

function withDay(days: DateKey[], day: DateKey): DateKey[] {
  if (days.includes(day)) return days;
  return [...days, day].sort();
}

/** Record that the learner was active at `nowMs` in `zone`. Pure: returns a new state. */
export function recordActivity(state: StreakState, nowMs: number, zone: string): RecordResult {
  if (!isValidTimeZone(zone)) throw new RangeError(`invalid time zone: ${zone}`);
  const events: StreakEvent[] = [];
  const today = localDateKey(nowMs, zone);

  if (state.zone !== zone) events.push({ type: "zone-changed", from: state.zone, to: zone });

  // First ever activity.
  if (state.lastActiveAt === null) {
    events.push({ type: "started" });
    return {
      state: {
        ...state,
        current: 1,
        longest: Math.max(state.longest, 1),
        lastActiveAt: nowMs,
        lastActiveDay: today,
        zone,
        activeDays: withDay(state.activeDays, today),
      },
      events,
    };
  }

  // Where did the last activity land on the calendar of the zone we are in NOW?
  const lastDay = localDateKey(state.lastActiveAt, zone);
  const gap = dayDiff(lastDay, today);

  if (nowMs < state.lastActiveAt) events.push({ type: "clock-went-backwards" });

  // Same day (or an earlier timestamp): nothing to add, never lose progress.
  if (gap <= 0) {
    events.push({ type: "already-counted" });
    const keepLatest = nowMs >= state.lastActiveAt;
    return {
      state: {
        ...state,
        zone,
        lastActiveAt: keepLatest ? nowMs : state.lastActiveAt,
        lastActiveDay: keepLatest ? today : localDateKey(state.lastActiveAt, zone),
      },
      events,
    };
  }

  let current = state.current;
  let freezes = state.freezes;

  if (gap === 1) {
    current += 1;
    events.push({ type: "extended", current });
  } else {
    const missed = gap - 1;
    if (freezes >= missed && current > 0) {
      const days = Array.from({ length: missed }, (_, i) => addDays(lastDay, i + 1));
      freezes -= missed;
      current += 1;
      events.push({ type: "freeze-used", days, remaining: freezes });
      events.push({ type: "extended", current });
    } else {
      if (current > 0) events.push({ type: "broken", previous: current });
      current = 1;
      events.push({ type: "comeback", daysAway: gap, bonusXp: COMEBACK_BONUS_XP });
    }
  }

  // Earn a freeze each time the run reaches a multiple of 7.
  if (current % FREEZE_EVERY === 0 && current > 0 && freezes < MAX_FREEZES) {
    freezes += 1;
    events.push({ type: "freeze-earned", freezes });
  }

  return {
    state: {
      ...state,
      current,
      longest: Math.max(state.longest, current),
      freezes,
      lastActiveAt: nowMs,
      lastActiveDay: today,
      zone,
      activeDays: withDay(state.activeDays, today),
    },
    events,
  };
}

export type StreakStatusKind = "none" | "counted-today" | "at-risk" | "frozen" | "broken";

export interface StreakStatus {
  kind: StreakStatusKind;
  /** The number to display right now. */
  current: number;
  longest: number;
  freezes: number;
}

/**
 * How the streak looks at `nowMs`, without changing anything.
 * - counted-today: already active today.
 * - at-risk: active yesterday; do something today to extend it (nothing lost yet).
 * - frozen: days were missed but held freezes will cover them automatically.
 * - broken: too many missed days; the next activity starts a new run.
 */
export function streakStatus(state: StreakState, nowMs: number, zone: string): StreakStatus {
  const base = { longest: state.longest, freezes: state.freezes };
  if (state.lastActiveAt === null) return { kind: "none", current: 0, ...base };
  const gap = dayDiff(localDateKey(state.lastActiveAt, zone), localDateKey(nowMs, zone));
  if (gap <= 0) return { kind: "counted-today", current: state.current, ...base };
  if (gap === 1) return { kind: "at-risk", current: state.current, ...base };
  const missed = gap - 1;
  if (state.freezes >= missed && state.current > 0) return { kind: "frozen", current: state.current, ...base };
  return { kind: "broken", current: 0, ...base };
}

/* -------------------------------------------------------------- import/export */

export type ValidateResult = { ok: true; state: StreakState } | { ok: false; errors: string[] };

const isCount = (v: unknown): v is number => typeof v === "number" && Number.isInteger(v) && v >= 0;

/** Validate untrusted data (a JSON import) and return a clean state or readable errors. */
export function validateStreakState(input: unknown): ValidateResult {
  const errors: string[] = [];
  if (typeof input !== "object" || input === null) return { ok: false, errors: ["not an object"] };
  const s = input as Record<string, unknown>;

  if (s.version !== 1) errors.push("unsupported version");
  if (!isCount(s.current)) errors.push("current must be a whole number, 0 or more");
  if (!isCount(s.longest)) errors.push("longest must be a whole number, 0 or more");
  if (!isCount(s.freezes) || s.freezes > MAX_FREEZES) errors.push(`freezes must be 0 to ${MAX_FREEZES}`);
  if (!isValidTimeZone(s.zone)) errors.push("zone is not a valid IANA time zone");
  if (s.lastActiveAt !== null && !(typeof s.lastActiveAt === "number" && Number.isFinite(s.lastActiveAt))) {
    errors.push("lastActiveAt must be a timestamp or null");
  }
  if (s.lastActiveDay !== null && !isDateKey(s.lastActiveDay)) errors.push("lastActiveDay must be YYYY-MM-DD or null");
  if (!Array.isArray(s.activeDays) || !s.activeDays.every(isDateKey)) errors.push("activeDays must be a list of YYYY-MM-DD");
  if (errors.length > 0) return { ok: false, errors };

  const current = s.current as number;
  const longest = s.longest as number;
  const zone = s.zone as string;
  const lastActiveAt = s.lastActiveAt as number | null;
  const lastActiveDay = s.lastActiveDay as DateKey | null;

  if (longest < current) errors.push("longest cannot be smaller than current");
  if ((lastActiveAt === null) !== (lastActiveDay === null)) errors.push("lastActiveAt and lastActiveDay must both be set or both be null");
  if (lastActiveAt === null && current > 0) errors.push("a streak needs a last activity");
  if (lastActiveAt !== null && lastActiveDay !== null && localDateKey(lastActiveAt, zone) !== lastActiveDay) {
    errors.push("lastActiveDay does not match lastActiveAt in this zone");
  }
  if (errors.length > 0) return { ok: false, errors };

  const activeDays = [...new Set(s.activeDays as DateKey[])].sort();
  return {
    ok: true,
    state: { version: 1, current, longest, freezes: s.freezes as number, lastActiveAt, lastActiveDay, zone, activeDays },
  };
}

/**
 * Combine two states (for example a backup and the live data). The one with the
 * later last activity wins for current run and freezes; the longest streak is
 * the best of both; active days are the union.
 */
export function mergeStreakStates(a: StreakState, b: StreakState): StreakState {
  const aTime = a.lastActiveAt ?? -Infinity;
  const bTime = b.lastActiveAt ?? -Infinity;
  const base = bTime > aTime ? b : a;
  const activeDays = [...new Set([...a.activeDays, ...b.activeDays])].sort();
  return {
    ...base,
    longest: Math.max(a.longest, b.longest, base.current),
    activeDays,
  };
}
