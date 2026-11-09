import { describe, expect, it } from "vitest";
import { MAX_LEVEL, RANKS, XP, levelFromXp, levelProgress, rankForLevel, xpFor, xpForLevel } from "./xp";

describe("level curve", () => {
  it("matches the documented thresholds", () => {
    expect([1, 2, 3, 4, 5].map(xpForLevel)).toEqual([0, 100, 225, 375, 550]);
  });

  it("every level costs a little more than the one before", () => {
    let prev = xpForLevel(2) - xpForLevel(1);
    for (let n = 2; n < MAX_LEVEL; n++) {
      const cost = xpForLevel(n + 1) - xpForLevel(n);
      expect(cost).toBe(100 + 25 * (n - 1));
      expect(cost).toBeGreaterThan(prev - 1);
      prev = cost;
    }
  });

  it("thresholds are strictly increasing integers", () => {
    for (let n = 1; n < MAX_LEVEL; n++) {
      expect(Number.isInteger(xpForLevel(n))).toBe(true);
      expect(xpForLevel(n + 1)).toBeGreaterThan(xpForLevel(n));
    }
  });

  it("levelFromXp inverts xpForLevel exactly at and around every boundary", () => {
    for (let n = 1; n <= MAX_LEVEL; n++) {
      const t = xpForLevel(n);
      expect(levelFromXp(t), `at T(${n})`).toBe(n);
      if (n > 1) expect(levelFromXp(t - 1), `just below T(${n})`).toBe(n - 1);
    }
  });

  it("is monotonic over a wide range of XP", () => {
    let last = 1;
    for (let xp = 0; xp < 200_000; xp += 37) {
      const lvl = levelFromXp(xp);
      expect(lvl).toBeGreaterThanOrEqual(last);
      last = lvl;
    }
  });

  it("clamps junk input to level 1 and huge XP to the cap", () => {
    for (const bad of [-5, NaN, -Infinity, 0.9]) expect(levelFromXp(bad)).toBe(1);
    expect(levelFromXp(Infinity)).toBe(1); // non-finite is treated as no XP
    expect(levelFromXp(1e12)).toBe(MAX_LEVEL);
  });

  it("xpForLevel clamps out-of-range levels", () => {
    expect(xpForLevel(0)).toBe(0);
    expect(xpForLevel(-3)).toBe(0);
    expect(xpForLevel(MAX_LEVEL + 50)).toBe(xpForLevel(MAX_LEVEL));
  });
});

describe("levelProgress", () => {
  it("reports progress inside a level", () => {
    expect(levelProgress(0)).toEqual({ level: 1, xpIntoLevel: 0, xpForNext: 100, fraction: 0, maxed: false });
    expect(levelProgress(150)).toMatchObject({ level: 2, xpIntoLevel: 50, xpForNext: 125, maxed: false });
    expect(levelProgress(150).fraction).toBeCloseTo(0.4);
  });

  it("fraction is always within 0..1 and reaches 1 only at max level", () => {
    for (let xp = 0; xp < 100_000; xp += 91) {
      const p = levelProgress(xp);
      expect(p.fraction).toBeGreaterThanOrEqual(0);
      expect(p.fraction).toBeLessThanOrEqual(1);
      if (!p.maxed) expect(p.fraction).toBeLessThan(1);
    }
  });

  it("at the cap the bar is full", () => {
    expect(levelProgress(xpForLevel(MAX_LEVEL) + 500)).toMatchObject({ level: MAX_LEVEL, fraction: 1, maxed: true });
  });
});

describe("ranks", () => {
  it("starts at Initiate and tops out at Production-Ready AI Engineer", () => {
    expect(rankForLevel(1).name).toBe("Initiate");
    expect(rankForLevel(MAX_LEVEL).name).toBe("Production-Ready AI Engineer");
    expect(rankForLevel(MAX_LEVEL).next).toBeNull();
  });

  it("promotes exactly at each threshold", () => {
    for (let i = 0; i < RANKS.length; i++) {
      const { level, name } = RANKS[i]!;
      expect(rankForLevel(level).name).toBe(name);
      if (level > 1) expect(rankForLevel(level - 1).index).toBe(i - 1);
    }
  });

  it("names the next rank", () => {
    expect(rankForLevel(3).next).toEqual({ name: "Apprentice", level: 5 });
  });
});

describe("xpFor", () => {
  it("rewards first time more than repeats", () => {
    expect(xpFor({ type: "step", firstTime: true })).toBe(XP.step);
    expect(xpFor({ type: "step", firstTime: false })).toBe(2);
    expect(xpFor({ type: "quiz", correct: true, firstTime: true })).toBe(XP.quizCorrect);
    expect(xpFor({ type: "quiz", correct: true, firstTime: false })).toBe(0);
    expect(xpFor({ type: "quiz", correct: false, firstTime: true })).toBe(0);
  });

  it("hints cost a little but never below the floor", () => {
    expect(xpFor({ type: "challenge", firstPass: true, hintsUsed: 0 })).toBe(40);
    expect(xpFor({ type: "challenge", firstPass: true, hintsUsed: 3 })).toBe(25);
    expect(xpFor({ type: "challenge", firstPass: true, hintsUsed: 99 })).toBe(XP.challengeFloor);
    expect(xpFor({ type: "challenge", firstPass: true, hintsUsed: -4 })).toBe(40);
    expect(xpFor({ type: "challenge", firstPass: false, hintsUsed: 0 })).toBe(XP.challengeRepeat);
  });

  it("bosses need the 80% pass mark", () => {
    expect(xpFor({ type: "boss", score: 0.79, firstClear: true })).toBe(0);
    expect(xpFor({ type: "boss", score: 0.8, firstClear: true })).toBe(XP.bossClear);
    expect(xpFor({ type: "boss", score: 1, firstClear: false })).toBe(XP.bossRepeat);
    expect(xpFor({ type: "boss", score: NaN, firstClear: true })).toBe(0);
  });

  it("review XP is capped", () => {
    expect(xpFor({ type: "review", cards: 5 })).toBe(10);
    expect(xpFor({ type: "review", cards: 10_000 })).toBe(XP.reviewCap);
    expect(xpFor({ type: "review", cards: -3 })).toBe(0);
  });

  it("games, daily quest and comeback", () => {
    expect(xpFor({ type: "game", won: true, firstWin: true })).toBe(XP.gameWin);
    expect(xpFor({ type: "game", won: false, firstWin: true })).toBe(0);
    expect(xpFor({ type: "daily-quest" })).toBe(XP.dailyQuest);
    expect(xpFor({ type: "comeback", bonusXp: 25 })).toBe(25);
    expect(xpFor({ type: "comeback", bonusXp: -10 })).toBe(0);
  });

  it("streak milestones only every 7 days and are capped", () => {
    expect(xpFor({ type: "streak-milestone", days: 6 })).toBe(0);
    expect(xpFor({ type: "streak-milestone", days: 7 })).toBe(14);
    expect(xpFor({ type: "streak-milestone", days: 70 })).toBe(100);
    expect(xpFor({ type: "streak-milestone", days: 0 })).toBe(0);
  });

  it("is never negative or fractional for any event", () => {
    const events = [
      { type: "step", firstTime: true },
      { type: "step", firstTime: false },
      { type: "challenge", firstPass: true, hintsUsed: 1000 },
      { type: "review", cards: 3.7 },
      { type: "comeback", bonusXp: 2.9 },
      { type: "streak-milestone", days: 21 },
    ] as const;
    for (const e of events) {
      const v = xpFor(e);
      expect(v).toBeGreaterThanOrEqual(0);
      expect(Number.isInteger(v)).toBe(true);
    }
  });
});
