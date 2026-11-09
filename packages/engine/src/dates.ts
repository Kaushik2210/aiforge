/**
 * Calendar-day primitives. A "day" is the learner's LOCAL calendar day, written
 * as YYYY-MM-DD. All day arithmetic is done on calendar numbers (days since
 * 1970-01-01), never on 24-hour blocks, so daylight saving (23 or 25 hour days)
 * cannot create or swallow a day.
 */

export type DateKey = string;

const KEY_RE = /^(\d{4})-(\d{2})-(\d{2})$/;
const DAY_MS = 86_400_000;

const formatters = new Map<string, Intl.DateTimeFormat>();

function formatter(timeZone: string): Intl.DateTimeFormat {
  let f = formatters.get(timeZone);
  if (!f) {
    // Throws RangeError for an unknown IANA zone, which is what we want.
    f = new Intl.DateTimeFormat("en-US", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hourCycle: "h23",
    });
    formatters.set(timeZone, f);
  }
  return f;
}

export function isValidTimeZone(timeZone: unknown): timeZone is string {
  if (typeof timeZone !== "string" || timeZone === "") return false;
  try {
    formatter(timeZone);
    return true;
  } catch {
    return false;
  }
}

interface Wall {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
}

function wallClock(ms: number, timeZone: string): Wall {
  if (!Number.isFinite(ms)) throw new RangeError("invalid instant");
  const out: Record<string, number> = {};
  for (const p of formatter(timeZone).formatToParts(ms)) {
    if (p.type !== "literal") out[p.type] = Number(p.value);
  }
  return {
    year: out.year!,
    month: out.month!,
    day: out.day!,
    hour: out.hour!,
    minute: out.minute!,
    second: out.second!,
  };
}

const pad = (n: number, w = 2) => String(n).padStart(w, "0");

/** The learner's local calendar day for an instant (epoch milliseconds). */
export function localDateKey(instant: number | Date, timeZone: string): DateKey {
  const ms = typeof instant === "number" ? instant : instant.getTime();
  const w = wallClock(ms, timeZone);
  return `${pad(w.year, 4)}-${pad(w.month)}-${pad(w.day)}`;
}

/** True only for real calendar dates (rejects 2026-02-30 and the like). */
export function isDateKey(value: unknown): value is DateKey {
  if (typeof value !== "string") return false;
  const m = KEY_RE.exec(value);
  if (!m) return false;
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const t = new Date(Date.UTC(y, mo - 1, d));
  return t.getUTCFullYear() === y && t.getUTCMonth() === mo - 1 && t.getUTCDate() === d;
}

/** Days since 1970-01-01 for a calendar date. */
export function dayNumber(key: DateKey): number {
  const m = KEY_RE.exec(key);
  if (!m || !isDateKey(key)) throw new RangeError(`invalid date key: ${key}`);
  return Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])) / DAY_MS;
}

/** Whole calendar days from a to b (positive when b is later). */
export function dayDiff(a: DateKey, b: DateKey): number {
  return dayNumber(b) - dayNumber(a);
}

export function addDays(key: DateKey, n: number): DateKey {
  const t = new Date((dayNumber(key) + n) * DAY_MS);
  return `${pad(t.getUTCFullYear(), 4)}-${pad(t.getUTCMonth() + 1)}-${pad(t.getUTCDate())}`;
}

/** Offset of a zone from UTC at an instant, in milliseconds (local minus UTC). */
export function zoneOffsetMs(instant: number, timeZone: string): number {
  const w = wallClock(instant, timeZone);
  const asUtc = Date.UTC(w.year, w.month - 1, w.day, w.hour, w.minute, w.second);
  return asUtc - Math.floor(instant / 1000) * 1000;
}

/**
 * The instant at which a zone's wall clock shows the given local date and time.
 * For a time that does not exist (spring-forward gap) or happens twice
 * (fall-back), it returns one reasonable instant, which is enough for tests and
 * for importing user data.
 */
export function instantFromLocal(
  key: DateKey,
  time: { hour?: number; minute?: number; second?: number; ms?: number },
  timeZone: string,
): number {
  const m = KEY_RE.exec(key);
  if (!m || !isDateKey(key)) throw new RangeError(`invalid date key: ${key}`);
  const naive = Date.UTC(
    Number(m[1]),
    Number(m[2]) - 1,
    Number(m[3]),
    time.hour ?? 0,
    time.minute ?? 0,
    time.second ?? 0,
    time.ms ?? 0,
  );
  let guess = naive;
  for (let i = 0; i < 3; i++) guess = naive - zoneOffsetMs(guess, timeZone);
  return guess;
}
