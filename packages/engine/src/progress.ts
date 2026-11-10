import { evaluateDailyQuest } from "./dailyquest";
import { isDateKey, localDateKey } from "./dates";
import { levelFromXp, rankForLevel, xpFor } from "./xp";
import { REVIEW_SESSION_MIN_CARDS, MAX_INTERVAL_DAYS, MIN_EASE, newCard, review, type Card, type Rating } from "./srs";
import {
  mergeStreakStates,
  newStreakState,
  recordActivity,
  validateStreakState,
  type StreakEvent,
  type StreakState,
} from "./streak";

/**
 * The learner's whole progress as one plain, JSON-safe object, plus a pure
 * reducer that turns learning events into a new snapshot. Persistence (IndexedDB)
 * lives in the web app and only loads, reduces and saves; all rules are here.
 */

export const SCHEMA_VERSION = 1;
export const MAX_LEDGER = 300;
const MAX_KEYS = 20_000;
const FORBIDDEN_KEYS = new Set(["__proto__", "constructor", "prototype"]);

export interface LedgerEntry {
  at: number;
  kind: string;
  xp: number;
  ref: string;
}

export interface QuizRecord {
  attempts: number;
  correct: number;
  /** Per item: has it ever been answered correctly? */
  items: Record<string, boolean>;
}

export interface ChallengeRecord {
  attempts: number;
  passed: boolean;
  firstPassAt: number | null;
  /** Fewest hints used on any passing run (null until first pass). */
  bestHints: number | null;
}

export interface BossRecord {
  best: number;
  attempts: number;
  clearedAt: number | null;
}

export interface GameRecord {
  plays: number;
  wins: number;
}

export interface ProgressSnapshot {
  schemaVersion: number;
  createdAt: number;
  xpTotal: number;
  /** Most recent XP awards, newest last. Totals live in xpTotal. */
  ledger: LedgerEntry[];
  streak: StreakState;
  steps: Record<string, number>;
  quiz: Record<string, QuizRecord>;
  challenges: Record<string, ChallengeRecord>;
  bosses: Record<string, BossRecord>;
  games: Record<string, GameRecord>;
  cards: Record<string, Card>;
}

export function emptySnapshot(zone: string, nowMs: number): ProgressSnapshot {
  return {
    schemaVersion: SCHEMA_VERSION,
    createdAt: nowMs,
    xpTotal: 0,
    ledger: [],
    streak: newStreakState(zone),
    steps: {},
    quiz: {},
    challenges: {},
    bosses: {},
    games: {},
    cards: {},
  };
}

/* ------------------------------------------------------------------ events */

export type ProgressEvent =
  | { type: "step-complete"; id: string }
  | { type: "quiz-answer"; topicId: string; itemId: string; correct: boolean }
  | { type: "challenge-run"; id: string; passed: boolean; hintsUsed: number }
  | { type: "boss-result"; id: string; score: number }
  | { type: "enroll-cards"; topicId: string; cardIds: string[] }
  | { type: "review-session"; reviews: { cardId: string; rating: Rating }[] }
  | { type: "game-result"; id: string; won: boolean }
  /** Pay the Daily Quest bonus, once a day, only if all three goals were done today. */
  | { type: "daily-quest-claim" };

export interface ReduceResult {
  snapshot: ProgressSnapshot;
  xpGained: number;
  streakEvents: StreakEvent[];
  levelUp: { from: number; to: number } | null;
  rankUp: { from: string; to: string } | null;
}

const safeKey = (k: string) => typeof k === "string" && k.length > 0 && k.length <= 200 && !FORBIDDEN_KEYS.has(k);

/** Apply one learning event. Pure: never mutates the input snapshot. */
export function applyEvent(prev: ProgressSnapshot, event: ProgressEvent, nowMs: number, zone: string): ReduceResult {
  const today = localDateKey(nowMs, zone);
  const s: ProgressSnapshot = {
    ...prev,
    steps: { ...prev.steps },
    quiz: { ...prev.quiz },
    challenges: { ...prev.challenges },
    bosses: { ...prev.bosses },
    games: { ...prev.games },
    cards: { ...prev.cards },
    ledger: [...prev.ledger],
  };

  const awards: LedgerEntry[] = [];
  const award = (kind: string, xp: number, ref: string) => {
    if (xp > 0) awards.push({ at: nowMs, kind, xp, ref });
  };
  let activity = false;

  switch (event.type) {
    case "step-complete": {
      if (!safeKey(event.id)) throw new RangeError("invalid step id");
      const first = !(event.id in s.steps);
      if (first) s.steps[event.id] = nowMs;
      award("step", xpFor({ type: "step", firstTime: first }), event.id);
      activity = true;
      break;
    }
    case "quiz-answer": {
      if (!safeKey(event.topicId) || !safeKey(event.itemId)) throw new RangeError("invalid quiz id");
      const rec: QuizRecord = prev.quiz[event.topicId]
        ? { ...prev.quiz[event.topicId]!, items: { ...prev.quiz[event.topicId]!.items } }
        : { attempts: 0, correct: 0, items: {} };
      const first = !rec.items[event.itemId];
      rec.attempts += 1;
      if (event.correct) rec.correct += 1;
      if (event.correct) rec.items[event.itemId] = true;
      else if (!(event.itemId in rec.items)) rec.items[event.itemId] = false;
      s.quiz[event.topicId] = rec;
      award("quiz", xpFor({ type: "quiz", correct: event.correct, firstTime: first }), `${event.topicId}/${event.itemId}`);
      break;
    }
    case "challenge-run": {
      if (!safeKey(event.id)) throw new RangeError("invalid challenge id");
      const rec: ChallengeRecord = {
        ...(prev.challenges[event.id] ?? { attempts: 0, passed: false, firstPassAt: null, bestHints: null }),
      };
      rec.attempts += 1;
      if (event.passed) {
        const first = !rec.passed;
        const hints = Math.max(0, Math.floor(event.hintsUsed) || 0);
        award("challenge", xpFor({ type: "challenge", firstPass: first, hintsUsed: hints }), event.id);
        if (first) rec.firstPassAt = nowMs;
        rec.passed = true;
        rec.bestHints = rec.bestHints === null ? hints : Math.min(rec.bestHints, hints);
        activity = true; // passing a challenge is a lesson step
      }
      s.challenges[event.id] = rec;
      break;
    }
    case "boss-result": {
      if (!safeKey(event.id)) throw new RangeError("invalid boss id");
      const score = Math.min(1, Math.max(0, Number.isFinite(event.score) ? event.score : 0));
      const rec: BossRecord = { ...(prev.bosses[event.id] ?? { best: 0, attempts: 0, clearedAt: null }) };
      rec.attempts += 1;
      rec.best = Math.max(rec.best, score);
      const firstClear = rec.clearedAt === null && score >= 0.8;
      if (firstClear) rec.clearedAt = nowMs;
      s.bosses[event.id] = rec;
      award("boss", xpFor({ type: "boss", score, firstClear }), event.id);
      break;
    }
    case "enroll-cards": {
      if (!safeKey(event.topicId)) throw new RangeError("invalid topic id");
      for (const id of event.cardIds) {
        if (!safeKey(id)) throw new RangeError("invalid card id");
        if (!(id in s.cards)) s.cards[id] = newCard(id, event.topicId, today);
      }
      break;
    }
    case "review-session": {
      let done = 0;
      for (const { cardId, rating } of event.reviews) {
        const card = s.cards[cardId];
        if (!card) continue;
        s.cards[cardId] = review(card, rating, today);
        done += 1;
      }
      award("review", xpFor({ type: "review", cards: done }), `${done} cards`);
      if (done >= REVIEW_SESSION_MIN_CARDS) activity = true;
      break;
    }
    case "daily-quest-claim": {
      const status = evaluateDailyQuest(prev, today, zone);
      if (status.complete && !status.claimed) award("daily-quest", xpFor({ type: "daily-quest" }), today);
      break;
    }
    case "game-result": {
      if (!safeKey(event.id)) throw new RangeError("invalid game id");
      const rec: GameRecord = { ...(prev.games[event.id] ?? { plays: 0, wins: 0 }) };
      const firstWin = event.won && rec.wins === 0;
      rec.plays += 1;
      if (event.won) rec.wins += 1;
      s.games[event.id] = rec;
      award("game", xpFor({ type: "game", won: event.won, firstWin }), event.id);
      break;
    }
  }

  let streakEvents: StreakEvent[] = [];
  if (activity) {
    const r = recordActivity(prev.streak, nowMs, zone);
    s.streak = r.state;
    streakEvents = r.events;
    for (const e of r.events) {
      if (e.type === "comeback") award("comeback", xpFor({ type: "comeback", bonusXp: e.bonusXp }), `${e.daysAway} days away`);
      if (e.type === "extended") award("streak", xpFor({ type: "streak-milestone", days: e.current }), `${e.current}-day streak`);
    }
  }

  const xpGained = awards.reduce((n, a) => n + a.xp, 0);
  s.xpTotal = prev.xpTotal + xpGained;
  s.ledger = [...s.ledger, ...awards].slice(-MAX_LEDGER);

  const lvBefore = levelFromXp(prev.xpTotal);
  const lvAfter = levelFromXp(s.xpTotal);
  const rankBefore = rankForLevel(lvBefore).name;
  const rankAfter = rankForLevel(lvAfter).name;

  return {
    snapshot: s,
    xpGained,
    streakEvents,
    levelUp: lvAfter > lvBefore ? { from: lvBefore, to: lvAfter } : null,
    rankUp: rankAfter !== rankBefore ? { from: rankBefore, to: rankAfter } : null,
  };
}

/* ------------------------------------------------------------- validation */

export type SnapshotResult = { ok: true; snapshot: ProgressSnapshot } | { ok: false; errors: string[] };

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);
const isCount = (v: unknown): v is number => typeof v === "number" && Number.isInteger(v) && v >= 0 && v <= 1e12;
const isTime = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v) && v >= 0 && v < 8.64e15;

function checkKeys(name: string, obj: Record<string, unknown>, errors: string[]) {
  const keys = Object.keys(obj);
  if (keys.length > MAX_KEYS) errors.push(`${name}: too many entries`);
  for (const k of keys) if (!safeKey(k)) errors.push(`${name}: unsafe key "${k.slice(0, 40)}"`);
}

function validCard(c: unknown): c is Card {
  if (!isObj(c)) return false;
  return (
    typeof c.id === "string" &&
    typeof c.topicId === "string" &&
    typeof c.ease === "number" && c.ease >= MIN_EASE && c.ease <= 5 &&
    isCount(c.interval) && c.interval <= MAX_INTERVAL_DAYS &&
    isCount(c.reps) && isCount(c.lapses) &&
    isDateKey(c.due) &&
    (c.lastReviewed === null || isDateKey(c.lastReviewed))
  );
}

/** Validate untrusted data that already has the current schema version. */
export function validateSnapshot(input: unknown): SnapshotResult {
  const errors: string[] = [];
  if (!isObj(input)) return { ok: false, errors: ["not an object"] };
  if (input.schemaVersion !== SCHEMA_VERSION) errors.push(`schemaVersion must be ${SCHEMA_VERSION}`);
  if (!isTime(input.createdAt)) errors.push("createdAt must be a timestamp");
  if (!isCount(input.xpTotal)) errors.push("xpTotal must be a whole number, 0 or more");

  const ledger = input.ledger;
  if (!Array.isArray(ledger) || ledger.length > MAX_LEDGER) errors.push("ledger must be a list of at most " + MAX_LEDGER);
  else
    for (const e of ledger) {
      if (!isObj(e) || !isTime(e.at) || typeof e.kind !== "string" || !isCount(e.xp) || typeof e.ref !== "string") {
        errors.push("ledger has a malformed entry");
        break;
      }
    }

  const streak = validateStreakState(input.streak);
  if (!streak.ok) errors.push(...streak.errors.map((e) => `streak: ${e}`));

  for (const name of ["steps", "quiz", "challenges", "bosses", "games", "cards"] as const) {
    const v = input[name];
    if (!isObj(v)) errors.push(`${name} must be an object`);
    else checkKeys(name, v, errors);
  }
  if (errors.length > 0) return { ok: false, errors };

  const steps = input.steps as Record<string, unknown>;
  for (const [k, v] of Object.entries(steps)) if (!isTime(v)) errors.push(`steps.${k}: not a timestamp`);

  for (const [k, v] of Object.entries(input.quiz as Record<string, unknown>)) {
    if (!isObj(v) || !isCount(v.attempts) || !isCount(v.correct) || v.correct > v.attempts || !isObj(v.items)) {
      errors.push(`quiz.${k}: malformed`);
      continue;
    }
    checkKeys(`quiz.${k}.items`, v.items, errors);
    if (!Object.values(v.items).every((x) => typeof x === "boolean")) errors.push(`quiz.${k}.items: must be true/false`);
  }

  for (const [k, v] of Object.entries(input.challenges as Record<string, unknown>)) {
    if (
      !isObj(v) || !isCount(v.attempts) || typeof v.passed !== "boolean" ||
      !(v.firstPassAt === null || isTime(v.firstPassAt)) || !(v.bestHints === null || isCount(v.bestHints))
    ) errors.push(`challenges.${k}: malformed`);
  }

  for (const [k, v] of Object.entries(input.bosses as Record<string, unknown>)) {
    if (
      !isObj(v) || typeof v.best !== "number" || v.best < 0 || v.best > 1 || !isCount(v.attempts) ||
      !(v.clearedAt === null || isTime(v.clearedAt))
    ) errors.push(`bosses.${k}: malformed`);
  }

  for (const [k, v] of Object.entries(input.games as Record<string, unknown>)) {
    if (!isObj(v) || !isCount(v.plays) || !isCount(v.wins) || v.wins > v.plays) errors.push(`games.${k}: malformed`);
  }

  for (const [k, v] of Object.entries(input.cards as Record<string, unknown>)) {
    if (!validCard(v) || (v as Card).id !== k) errors.push(`cards.${k}: malformed`);
  }

  if (errors.length > 0) return { ok: false, errors: errors.slice(0, 20) };

  // Rebuild from known fields only, with null-prototype-free plain objects.
  const copy = JSON.parse(JSON.stringify({
    schemaVersion: SCHEMA_VERSION,
    createdAt: input.createdAt,
    xpTotal: input.xpTotal,
    ledger: input.ledger,
    streak: (streak as { ok: true; state: StreakState }).state,
    steps: input.steps,
    quiz: input.quiz,
    challenges: input.challenges,
    bosses: input.bosses,
    games: input.games,
    cards: input.cards,
  })) as ProgressSnapshot;
  return { ok: true, snapshot: copy };
}

/* -------------------------------------------------------------- migrations */

export type Migration = (data: Record<string, unknown>) => Record<string, unknown>;
/** Key n holds the migration from schema version n to n + 1. */
export type MigrationRegistry = Record<number, Migration>;

export const MIGRATIONS: MigrationRegistry = {
  // No migrations yet: version 1 is the first schema.
};

export type MigrateResult = { ok: true; data: Record<string, unknown> } | { ok: false; error: string };

/** Bring older data up to `target`. Refuses data from a newer app version. */
export function migrate(
  raw: unknown,
  registry: MigrationRegistry = MIGRATIONS,
  target: number = SCHEMA_VERSION,
): MigrateResult {
  if (!isObj(raw)) return { ok: false, error: "not an object" };
  let version = raw.schemaVersion;
  if (typeof version !== "number" || !Number.isInteger(version) || version < 1) {
    return { ok: false, error: "missing or invalid schemaVersion" };
  }
  if (version > target) {
    return { ok: false, error: `this data was saved by a newer version of AIForge (schema ${version}); update the app and try again` };
  }
  let data: Record<string, unknown> = { ...raw };
  while ((version as number) < target) {
    const step = registry[version as number];
    if (!step) return { ok: false, error: `no migration from schema ${version}` };
    data = { ...step(data), schemaVersion: (version as number) + 1 };
    version = (version as number) + 1;
  }
  return { ok: true, data };
}

/* ----------------------------------------------------------- export/import */

export const EXPORT_KIND = "aiforge-progress";

export interface ExportFile {
  kind: typeof EXPORT_KIND;
  schemaVersion: number;
  exportedAt: number;
  snapshot: ProgressSnapshot;
}

export function exportProgress(snapshot: ProgressSnapshot, nowMs: number): ExportFile {
  return { kind: EXPORT_KIND, schemaVersion: SCHEMA_VERSION, exportedAt: nowMs, snapshot };
}

/** Parse the text of an exported file: JSON, kind, migrate, validate. */
export function parseExport(text: string): SnapshotResult {
  if (text.length > 20_000_000) return { ok: false, errors: ["file is too large"] };
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    return { ok: false, errors: ["not valid JSON"] };
  }
  if (!isObj(raw) || raw.kind !== EXPORT_KIND) return { ok: false, errors: ["this is not an AIForge progress export"] };
  const migrated = migrate(raw.snapshot);
  if (!migrated.ok) return { ok: false, errors: [migrated.error] };
  return validateSnapshot(migrated.data);
}

/**
 * Combine two snapshots (for example this device and an import). Rules: XP is
 * the larger total (the ledgers cannot be reconciled), per-item records keep
 * the best result, steps keep the earliest completion, cards keep whichever copy
 * was reviewed most recently, and streaks merge as in `mergeStreakStates`.
 */
export function mergeSnapshots(a: ProgressSnapshot, b: ProgressSnapshot): ProgressSnapshot {
  const out: ProgressSnapshot = {
    schemaVersion: SCHEMA_VERSION,
    createdAt: Math.min(a.createdAt, b.createdAt),
    xpTotal: Math.max(a.xpTotal, b.xpTotal),
    ledger: (a.xpTotal >= b.xpTotal ? a : b).ledger,
    streak: mergeStreakStates(a.streak, b.streak),
    steps: { ...b.steps },
    quiz: {},
    challenges: {},
    bosses: {},
    games: {},
    cards: {},
  };
  for (const [k, t] of Object.entries(a.steps)) out.steps[k] = k in out.steps ? Math.min(t, out.steps[k]!) : t;

  for (const k of new Set([...Object.keys(a.quiz), ...Object.keys(b.quiz)])) {
    const [x, y] = [a.quiz[k], b.quiz[k]];
    if (!x || !y) { out.quiz[k] = JSON.parse(JSON.stringify((x ?? y)!)) as QuizRecord; continue; }
    const base = x.attempts >= y.attempts ? x : y;
    const items = { ...x.items };
    for (const [i, ok] of Object.entries(y.items)) items[i] = (items[i] ?? false) || ok;
    out.quiz[k] = { attempts: base.attempts, correct: Math.max(x.correct, y.correct), items };
  }
  for (const k of new Set([...Object.keys(a.challenges), ...Object.keys(b.challenges)])) {
    const [x, y] = [a.challenges[k], b.challenges[k]];
    if (!x || !y) { out.challenges[k] = { ...(x ?? y)! }; continue; }
    const firsts = [x.firstPassAt, y.firstPassAt].filter((v): v is number => v !== null);
    const hints = [x.bestHints, y.bestHints].filter((v): v is number => v !== null);
    out.challenges[k] = {
      attempts: Math.max(x.attempts, y.attempts),
      passed: x.passed || y.passed,
      firstPassAt: firsts.length ? Math.min(...firsts) : null,
      bestHints: hints.length ? Math.min(...hints) : null,
    };
  }
  for (const k of new Set([...Object.keys(a.bosses), ...Object.keys(b.bosses)])) {
    const [x, y] = [a.bosses[k], b.bosses[k]];
    if (!x || !y) { out.bosses[k] = { ...(x ?? y)! }; continue; }
    const cleared = [x.clearedAt, y.clearedAt].filter((v): v is number => v !== null);
    out.bosses[k] = {
      best: Math.max(x.best, y.best),
      attempts: Math.max(x.attempts, y.attempts),
      clearedAt: cleared.length ? Math.min(...cleared) : null,
    };
  }
  for (const k of new Set([...Object.keys(a.games), ...Object.keys(b.games)])) {
    const [x, y] = [a.games[k], b.games[k]];
    out.games[k] = { plays: Math.max(x?.plays ?? 0, y?.plays ?? 0), wins: Math.max(x?.wins ?? 0, y?.wins ?? 0) };
  }
  for (const k of new Set([...Object.keys(a.cards), ...Object.keys(b.cards)])) {
    const [x, y] = [a.cards[k], b.cards[k]];
    if (!x || !y) { out.cards[k] = { ...(x ?? y)! }; continue; }
    const xr = x.lastReviewed ?? "";
    const yr = y.lastReviewed ?? "";
    out.cards[k] = { ...(xr >= yr ? x : y) };
  }
  return out;
}

