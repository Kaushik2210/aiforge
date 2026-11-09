/**
 * XP, levels and ranks.
 *
 * Level curve: the XP needed to go from level n to n+1 is 100 + 25*(n-1), so
 * each level costs a little more than the last (smooth, no cliffs).
 * Total XP to reach level n is therefore
 *   T(n) = 100*(n-1) + 25*(n-1)*(n-2)/2      (T(1)=0, T(2)=100, T(3)=225, ...)
 * which is always an integer.
 */

export const MAX_LEVEL = 100;

/** Total XP required to reach `level` (level 1 needs 0). */
export function xpForLevel(level: number): number {
  const n = Math.min(MAX_LEVEL, Math.max(1, Math.floor(level)));
  return 100 * (n - 1) + (25 * (n - 1) * (n - 2)) / 2;
}

/** The level a learner is on for a total XP (clamped to 1..MAX_LEVEL). */
export function levelFromXp(totalXp: number): number {
  const xp = Number.isFinite(totalXp) ? Math.max(0, Math.floor(totalXp)) : 0;
  // Solve 12.5 n^2 + 75 n - (87.5 + xp) = 0 for n, then correct for rounding.
  let n = Math.floor((-75 + Math.sqrt(75 * 75 + 50 * (87.5 + xp))) / 25);
  n = Math.min(MAX_LEVEL, Math.max(1, n));
  while (n < MAX_LEVEL && xpForLevel(n + 1) <= xp) n++;
  while (n > 1 && xpForLevel(n) > xp) n--;
  return n;
}

export interface LevelProgress {
  level: number;
  /** XP earned inside the current level. */
  xpIntoLevel: number;
  /** XP the current level needs to complete (0 at max level). */
  xpForNext: number;
  /** 0..1 fill for a progress bar (1 at max level). */
  fraction: number;
  maxed: boolean;
}

export function levelProgress(totalXp: number): LevelProgress {
  const xp = Number.isFinite(totalXp) ? Math.max(0, Math.floor(totalXp)) : 0;
  const level = levelFromXp(xp);
  if (level >= MAX_LEVEL) {
    return { level, xpIntoLevel: xp - xpForLevel(level), xpForNext: 0, fraction: 1, maxed: true };
  }
  const start = xpForLevel(level);
  const span = xpForLevel(level + 1) - start;
  return { level, xpIntoLevel: xp - start, xpForNext: span, fraction: (xp - start) / span, maxed: false };
}

/** Rank ladder; a learner holds the highest rank whose level they have reached. */
export const RANKS = [
  { name: "Initiate", level: 1 },
  { name: "Apprentice", level: 5 },
  { name: "Practitioner", level: 10 },
  { name: "Engineer", level: 20 },
  { name: "Senior", level: 35 },
  { name: "Architect", level: 50 },
  { name: "Production-Ready AI Engineer", level: 75 },
] as const;

export interface RankInfo {
  index: number;
  name: string;
  /** The next rank, or null at the top. */
  next: { name: string; level: number } | null;
}

export function rankForLevel(level: number): RankInfo {
  let index = 0;
  for (let i = 0; i < RANKS.length; i++) {
    if (level >= RANKS[i]!.level) index = i;
  }
  const next = RANKS[index + 1];
  return { index, name: RANKS[index]!.name, next: next ? { name: next.name, level: next.level } : null };
}

/* ------------------------------------------------------------------ awards */

export type XpEvent =
  | { type: "step"; firstTime: boolean }
  | { type: "quiz"; correct: boolean; firstTime: boolean }
  | { type: "challenge"; firstPass: boolean; hintsUsed: number }
  | { type: "boss"; score: number; firstClear: boolean }
  | { type: "review"; cards: number }
  | { type: "game"; won: boolean; firstWin: boolean }
  | { type: "daily-quest" }
  | { type: "streak-milestone"; days: number }
  | { type: "comeback"; bonusXp: number };

export const XP = {
  step: 10,
  quizCorrect: 5,
  challengeFirstPass: 40,
  challengeRepeat: 5,
  hintPenalty: 5,
  challengeFloor: 20,
  bossClear: 100,
  bossRepeat: 20,
  reviewPerCard: 2,
  reviewCap: 40,
  gameWin: 30,
  gameRepeat: 5,
  dailyQuest: 25,
  /** Repeating something already done still earns this fraction. */
  repeatFraction: 0.2,
} as const;

/**
 * XP for an event. Never negative, never more than a small amount for farming
 * the same thing twice. Hints cost a little but can never push a first pass
 * below the floor, so asking for help is never punished harshly.
 */
export function xpFor(event: XpEvent): number {
  switch (event.type) {
    case "step":
      return event.firstTime ? XP.step : Math.round(XP.step * XP.repeatFraction);
    case "quiz":
      return event.correct && event.firstTime ? XP.quizCorrect : 0;
    case "challenge": {
      if (!event.firstPass) return XP.challengeRepeat;
      const hints = Math.max(0, Math.floor(event.hintsUsed) || 0);
      return Math.max(XP.challengeFloor, XP.challengeFirstPass - XP.hintPenalty * hints);
    }
    case "boss": {
      const score = Math.min(1, Math.max(0, Number.isFinite(event.score) ? event.score : 0));
      if (score < 0.8) return 0;
      return event.firstClear ? XP.bossClear : XP.bossRepeat;
    }
    case "review":
      return Math.min(XP.reviewCap, Math.max(0, Math.floor(event.cards)) * XP.reviewPerCard);
    case "game":
      return event.won ? (event.firstWin ? XP.gameWin : XP.gameRepeat) : 0;
    case "daily-quest":
      return XP.dailyQuest;
    case "streak-milestone":
      return event.days > 0 && event.days % 7 === 0 ? Math.min(100, event.days * 2) : 0;
    case "comeback":
      return Math.max(0, Math.floor(event.bonusXp) || 0);
  }
}
