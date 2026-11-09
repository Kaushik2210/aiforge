import type { DateKey } from "./dates";
import { retrievability, type Card } from "./srs";

/**
 * Topic mastery, 0..100, from three kinds of evidence:
 *   quiz accuracy (25%), memory retention of the topic's flashcards (35%),
 *   and the best boss score (40%).
 * Missing evidence counts as zero, so 100% genuinely requires all three.
 * Weights are first drafts and are meant to be tuned.
 */
export const MASTERY_WEIGHTS = { quiz: 0.25, retention: 0.35, boss: 0.4 } as const;

export interface QuizEvidence {
  correct: number;
  attempts: number;
}

export interface MasteryInput {
  quiz: QuizEvidence;
  /** Every flashcard in the topic, reviewed or not. */
  cards: readonly Card[];
  /** Best boss score in 0..1, or null if the boss has not been attempted. */
  bossBest: number | null;
}

export interface MasteryBreakdown {
  /** 0..100, rounded to a whole number. */
  percent: number;
  quiz: number; // each 0..1
  retention: number;
  boss: number;
  label: MasteryLabel;
}

export type MasteryLabel = "Unseen" | "Learning" | "Familiar" | "Solid" | "Mastered";

const clamp01 = (n: number) => (Number.isFinite(n) ? Math.min(1, Math.max(0, n)) : 0);

/**
 * Quiz accuracy, smoothed so one lucky answer is not "100%": Laplace smoothing
 * toward 50%, then scaled by how much evidence there is (10 answers = full weight).
 */
export function quizScore(q: QuizEvidence): number {
  const attempts = Math.max(0, Math.floor(q.attempts));
  if (attempts === 0) return 0;
  const correct = Math.min(attempts, Math.max(0, Math.floor(q.correct)));
  const smoothed = (correct + 1) / (attempts + 2);
  return clamp01(smoothed * Math.min(1, attempts / 10));
}

/** Mean estimated recall across all the topic's cards; unseen cards count as 0. */
export function retentionScore(cards: readonly Card[], today: DateKey): number {
  if (cards.length === 0) return 0;
  const sum = cards.reduce((acc, c) => acc + retrievability(c, today), 0);
  return clamp01(sum / cards.length);
}

export function masteryLabel(percent: number): MasteryLabel {
  if (percent <= 0) return "Unseen";
  if (percent < 40) return "Learning";
  if (percent < 70) return "Familiar";
  if (percent < 90) return "Solid";
  return "Mastered";
}

export function topicMastery(input: MasteryInput, today: DateKey): MasteryBreakdown {
  const quiz = quizScore(input.quiz);
  const retention = retentionScore(input.cards, today);
  const boss = input.bossBest === null ? 0 : clamp01(input.bossBest);
  const raw = MASTERY_WEIGHTS.quiz * quiz + MASTERY_WEIGHTS.retention * retention + MASTERY_WEIGHTS.boss * boss;
  const percent = Math.round(clamp01(raw) * 100);
  return { percent, quiz, retention, boss, label: masteryLabel(percent) };
}

/** Section (realm) mastery: the plain average over its topics; topics with no evidence count as 0. */
export function sectionMastery(topicPercents: readonly number[]): number {
  if (topicPercents.length === 0) return 0;
  return Math.round(topicPercents.reduce((a, b) => a + b, 0) / topicPercents.length);
}
