import { addDays, dayDiff, dayNumber, localDateKey, type DateKey } from "./dates";
import type { LedgerEntry } from "./progress";

/**
 * Numbers behind the dashboard charts: XP per day, the activity heatmap grid and
 * the XP-over-time series. Pure and timezone-safe (days are the learner's local
 * calendar days, as everywhere else in the engine).
 *
 * The XP ledger keeps only the most recent entries (see MAX_LEDGER), so charts
 * say plainly where their data starts instead of guessing about older days.
 */

/** XP earned on each local day, from the ledger. */
export function dailyXp(ledger: readonly LedgerEntry[], zone: string): Map<DateKey, number> {
  const out = new Map<DateKey, number>();
  for (const e of ledger) {
    const day = localDateKey(e.at, zone);
    out.set(day, (out.get(day) ?? 0) + e.xp);
  }
  return out;
}

/** 0 = Monday ... 6 = Sunday. (1970-01-01 was a Thursday, which is 3.) */
export function weekdayMonday0(day: DateKey): number {
  return (((dayNumber(day) + 3) % 7) + 7) % 7;
}

export function mondayOnOrBefore(day: DateKey): DateKey {
  return addDays(day, -weekdayMonday0(day));
}

export interface HeatCell {
  day: DateKey;
  /** 0 = no activity, 1 to 4 = more XP that day. */
  level: 0 | 1 | 2 | 3 | 4;
  xp: number;
  active: boolean;
  /** Days after today are drawn empty and never counted. */
  future: boolean;
}

export interface Heatmap {
  /** Columns are weeks (oldest first, Monday to Sunday down each column). */
  weeks: HeatCell[][];
  /** Where a new month starts, for the labels along the top. */
  months: { week: number; label: string }[];
  activeDays: number;
  /** First day shown. */
  from: DateKey;
}

/**
 * Level thresholds for an active day: 1 = active, 2 = 20+ XP, 3 = 50+ XP, 4 = 100+ XP.
 * A day that counted for the streak but has no XP in the ledger (older than the
 * ledger window) still shows as level 1.
 */
export function heatLevel(active: boolean, xp: number): HeatCell["level"] {
  if (!active) return 0;
  if (xp >= 100) return 4;
  if (xp >= 50) return 3;
  if (xp >= 20) return 2;
  return 1;
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** A GitHub-style grid of the last `weeks` weeks ending with the week that contains `today`. */
export function buildHeatmap(
  activeDays: readonly DateKey[],
  xpByDay: ReadonlyMap<DateKey, number>,
  today: DateKey,
  weeks = 26,
): Heatmap {
  const active = new Set(activeDays);
  const start = addDays(mondayOnOrBefore(today), -(weeks - 1) * 7);
  const cols: HeatCell[][] = [];
  let activeCount = 0;
  const months: { week: number; label: string }[] = [];
  let lastMonth = -1;

  for (let w = 0; w < weeks; w++) {
    const col: HeatCell[] = [];
    for (let d = 0; d < 7; d++) {
      const day = addDays(start, w * 7 + d);
      const future = dayDiff(today, day) > 0;
      const isActive = !future && active.has(day);
      const xp = future ? 0 : (xpByDay.get(day) ?? 0);
      if (isActive) activeCount++;
      col.push({ day, level: heatLevel(isActive, xp), xp, active: isActive, future });
    }
    cols.push(col);
    const month = Number(col[0]!.day.slice(5, 7)) - 1;
    if (month !== lastMonth) {
      months.push({ week: w, label: MONTHS[month]! });
      lastMonth = month;
    }
  }
  return { weeks: cols, months, activeDays: activeCount, from: start };
}

export interface XpPoint {
  day: DateKey;
  xp: number;
  /** Total XP at the end of that day (null where the ledger no longer reaches). */
  cumulative: number | null;
}

export interface XpSeries {
  points: XpPoint[];
  /** First day whose numbers are reliable, or null when no day is. */
  knownFrom: DateKey | null;
  /** True when the whole window is covered by the ledger. */
  complete: boolean;
}

/**
 * Cumulative XP for the last `days` days. The end of the series is the exact
 * `xpTotal`; earlier days are found by subtracting each day's XP going backwards.
 * If the ledger was trimmed, days before its oldest entry are marked unknown.
 */
export function xpSeries(
  ledger: readonly LedgerEntry[],
  xpTotal: number,
  zone: string,
  today: DateKey,
  days = 30,
  ledgerLimit = 300,
): XpSeries {
  const perDay = dailyXp(ledger, zone);
  const windowStart = addDays(today, -(days - 1));
  const oldest = ledger.length ? localDateKey(ledger[0]!.at, zone) : null;
  const trimmed = ledger.length >= ledgerLimit;
  // The oldest day may be only partly covered when trimmed, so trust it only from the day after.
  const knownFrom = trimmed && oldest ? addDays(oldest, 1) : windowStart;

  const points: XpPoint[] = [];
  let running = Math.max(0, Math.floor(xpTotal));
  for (let i = 0; i < days; i++) {
    const day = addDays(today, -i);
    const xp = perDay.get(day) ?? 0;
    const known = dayDiff(knownFrom, day) >= 0;
    points.push({ day, xp: known ? xp : 0, cumulative: known ? running : null });
    running = Math.max(0, running - xp);
  }
  points.reverse();
  const first = points.find((p) => p.cumulative !== null);
  return { points, knownFrom: first ? first.day : null, complete: !trimmed || dayDiff(windowStart, knownFrom) <= 0 };
}
