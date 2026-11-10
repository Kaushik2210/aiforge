import { addDays, dayDiff, type DateKey } from "./dates";

/**
 * Spaced repetition: the SuperMemo SM-2 algorithm.
 *
 * From the original description (verified 2026-11-09, super-memory.com/english/ol/sm2.htm):
 * - response quality q is 0..5;
 * - the easiness factor EF starts at 2.5 and changes by
 *     EF' = EF + (0.1 - (5-q) * (0.08 + (5-q) * 0.02)),   never below 1.3;
 * - the first repetition is after 1 day, the second after 6 days, later ones
 *   are the previous interval times EF, rounded up to whole days;
 * - if q < 3 the item starts over (interval 1 day) and EF is left unchanged.
 *
 * AIForge choices (not part of SM-2): a four-button scale mapped to q, intervals
 * capped at one year, the interval uses the EF after this review's update, and
 * due dates are learner-local calendar days (same notion of "day" as streaks).
 * FSRS may replace this later; its constants differ by version, so they are not
 * reproduced from memory here.
 */

export type Rating = "again" | "hard" | "good" | "easy";

/** Mapping from the four buttons to SM-2 quality. */
export const RATING_QUALITY: Record<Rating, number> = { again: 1, hard: 3, good: 4, easy: 5 };

export const INITIAL_EASE = 2.5;
export const MIN_EASE = 1.3;
export const MAX_INTERVAL_DAYS = 365;
export const LEECH_LAPSES = 8;
/** A review session counts toward the streak from this many cards. */
export const REVIEW_SESSION_MIN_CARDS = 5;

export interface Card {
  id: string;
  /** The topic (quest) this card belongs to; used for interleaving and mastery. */
  topicId: string;
  ease: number;
  /** Current interval in days (0 until the first review). */
  interval: number;
  /** Consecutive successful reviews since the last lapse. */
  reps: number;
  lapses: number;
  due: DateKey;
  lastReviewed: DateKey | null;
}

export function newCard(id: string, topicId: string, today: DateKey): Card {
  return { id, topicId, ease: INITIAL_EASE, interval: 0, reps: 0, lapses: 0, due: today, lastReviewed: null };
}

/** SM-2's change to the easiness factor for a quality 0..5. */
export function sm2EaseDelta(q: number): number {
  return 0.1 - (5 - q) * (0.08 + (5 - q) * 0.02);
}

/** Review a card. Pure: returns the new card. Reviewing early or late is allowed. */
export function review(card: Card, rating: Rating, today: DateKey): Card {
  const q = RATING_QUALITY[rating];

  if (q < 3) {
    return {
      ...card,
      reps: 0,
      interval: 1,
      lapses: card.reps > 0 ? card.lapses + 1 : card.lapses,
      due: addDays(today, 1),
      lastReviewed: today,
    };
  }

  const ease = Math.max(MIN_EASE, round2(card.ease + sm2EaseDelta(q)));
  const reps = card.reps + 1;
  let interval: number;
  if (reps === 1) interval = 1;
  else if (reps === 2) interval = 6;
  else interval = Math.ceil(card.interval * ease);
  interval = Math.min(MAX_INTERVAL_DAYS, interval);

  return { ...card, ease, reps, interval, due: addDays(today, interval), lastReviewed: today };
}

const round2 = (n: number) => Math.round(n * 100) / 100;

export const isDue = (card: Card, today: DateKey): boolean => dayDiff(card.due, today) >= 0;
export const isLeech = (card: Card): boolean => card.lapses >= LEECH_LAPSES;

/**
 * Estimated chance the learner still remembers the card today. SM-2 has no
 * forgetting curve of its own, so this treats the interval as the time for
 * recall to fall to 90% (the standard definition of "stability") and decays
 * exponentially. A rough heuristic, used only for mastery display.
 */
export function retrievability(card: Card, today: DateKey): number {
  if (card.lastReviewed === null || card.interval <= 0) return 0;
  const elapsed = Math.max(0, dayDiff(card.lastReviewed, today));
  return Math.min(1, Math.max(0, Math.pow(0.9, elapsed / card.interval)));
}

/* ---------------------------------------------------------------- queue */

function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export interface QueueOptions {
  /** Maximum cards in the session. Default 20. */
  limit?: number;
  /** Maximum never-seen cards in the session. Default 10. */
  maxNew?: number;
  /** Seed for the topic order, so a session is reproducible. */
  seed?: number;
  /**
   * Top the session up with the cards coming due soonest until it has at least this
   * many (extra practice, never more than `limit`). Reviewing a card early is fine in SM-2.
   */
  fillTo?: number;
}

/**
 * Today's review session. Due cards only, most overdue first within a topic,
 * then interleaved round-robin across topics so related cards do not come in
 * a block (interleaving helps long-term retention). New cards are capped.
 */
export function buildReviewQueue(cards: readonly Card[], today: DateKey, opts: QueueOptions = {}): Card[] {
  const limit = Math.max(0, opts.limit ?? 20);
  const maxNew = Math.max(0, opts.maxNew ?? 10);
  const rnd = mulberry32(opts.seed ?? 1);

  // Most overdue first = earliest due date first; ties broken by id for determinism.
  const due = cards
    .filter((c) => isDue(c, today))
    .sort((a, b) => dayDiff(b.due, a.due) || a.id.localeCompare(b.id));

  let newCount = 0;
  const pool = due.filter((c) => {
    if (c.lastReviewed !== null) return true;
    newCount += 1;
    return newCount <= maxNew;
  });

  // Optional extra practice: pull in the cards that will be due next.
  const want = Math.min(limit, Math.max(0, opts.fillTo ?? 0));
  if (pool.length < want) {
    const upcoming = cards
      .filter((c) => !isDue(c, today))
      .sort((a, b) => dayDiff(b.due, a.due) || a.id.localeCompare(b.id));
    pool.push(...upcoming.slice(0, want - pool.length));
  }

  const byTopic = new Map<string, Card[]>();
  for (const c of pool) {
    const list = byTopic.get(c.topicId) ?? [];
    list.push(c);
    byTopic.set(c.topicId, list);
  }

  const topics = [...byTopic.keys()].sort();
  for (let i = topics.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [topics[i], topics[j]] = [topics[j]!, topics[i]!];
  }

  const out: Card[] = [];
  let progressed = true;
  while (out.length < limit && progressed) {
    progressed = false;
    for (const t of topics) {
      const next = byTopic.get(t)!.shift();
      if (next) {
        out.push(next);
        progressed = true;
        if (out.length >= limit) break;
      }
    }
  }
  return out;
}
