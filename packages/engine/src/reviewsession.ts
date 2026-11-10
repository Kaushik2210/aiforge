import type { DateKey } from "./dates";
import { review, type Card, type Rating } from "./srs";

/**
 * One sitting in the Review Tavern, as plain data and pure functions.
 *
 * Rules:
 * - The learner sees one card at a time and rates how it went.
 * - A card rated "again" comes back once more at the end of the sitting for
 *   practice, but only the FIRST rating counts for scheduling. Otherwise a lapse
 *   would be erased the moment you got the card right on the retry.
 * - The result is a list of (card, first rating) ready for the `review-session`
 *   progress event, which applies SM-2 and decides the streak and XP.
 */

export const RATINGS: readonly Rating[] = ["again", "hard", "good", "easy"];

export interface ReviewSessionState {
  /** Card ids still to show; the first one is the current card. */
  queue: string[];
  cards: Record<string, Card>;
  /** The first rating given to each card: the one that counts. */
  first: Record<string, Rating>;
  /** Cards already sent back for a retry (each at most once). */
  requeued: string[];
  /** Distinct cards in this sitting. */
  total: number;
}

export function startReviewSession(cards: readonly Card[]): ReviewSessionState {
  const unique = [...new Map(cards.map((c) => [c.id, c])).values()];
  return {
    queue: unique.map((c) => c.id),
    cards: Object.fromEntries(unique.map((c) => [c.id, c])),
    first: {},
    requeued: [],
    total: unique.length,
  };
}

export function currentCard(s: ReviewSessionState): Card | null {
  const id = s.queue[0];
  return id === undefined ? null : s.cards[id]!;
}

export const isFinished = (s: ReviewSessionState): boolean => s.queue.length === 0;

/** Rate the current card. Pure: returns the new state and ignores the call when finished. */
export function answerCurrent(s: ReviewSessionState, rating: Rating): ReviewSessionState {
  const id = s.queue[0];
  if (id === undefined) return s;
  const queue = s.queue.slice(1);
  const first = id in s.first ? s.first : { ...s.first, [id]: rating };
  let requeued = s.requeued;
  if (rating === "again" && !s.requeued.includes(id)) {
    queue.push(id);
    requeued = [...s.requeued, id];
  }
  return { ...s, queue, first, requeued };
}

/** How many distinct cards have been fully dealt with (rated and not waiting for a retry). */
export function cardsDone(s: ReviewSessionState): number {
  const waiting = new Set(s.queue);
  return Object.keys(s.first).filter((id) => !waiting.has(id)).length;
}

export interface SessionResult {
  reviews: { cardId: string; rating: Rating }[];
  counts: Record<Rating, number>;
  cardsReviewed: number;
}

/** What to send to the progress store: each card with its first rating. */
export function sessionResult(s: ReviewSessionState): SessionResult {
  const reviews = Object.entries(s.first).map(([cardId, rating]) => ({ cardId, rating }));
  const counts: Record<Rating, number> = { again: 0, hard: 0, good: 0, easy: 0 };
  for (const r of reviews) counts[r.rating]++;
  return { reviews, counts, cardsReviewed: reviews.length };
}

/** Days until the card is due again for each button, shown on the buttons so the choice is informed. */
export function previewIntervals(card: Card, today: DateKey): Record<Rating, number> {
  const days = (r: Rating) => {
    const next = review(card, r, today);
    return next.interval;
  };
  return { again: days("again"), hard: days("hard"), good: days("good"), easy: days("easy") };
}

/** "1 day", "6 days", "2 months", "1 year" for a number of days. */
export function formatInterval(days: number): string {
  if (days < 1) return "today";
  if (days === 1) return "1 day";
  if (days < 30) return `${days} days`;
  if (days < 365) {
    const months = Math.round(days / 30);
    return months === 1 ? "1 month" : `${months} months`;
  }
  return "1 year";
}
