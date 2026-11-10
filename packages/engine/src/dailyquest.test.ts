import { describe, expect, it } from "vitest";
import { addDays, instantFromLocal } from "./dates";
import { REVIEW_GOAL_CARDS, evaluateDailyQuest, generateDailyQuest, type Catalog } from "./dailyquest";
import { applyEvent, emptySnapshot, type ProgressEvent, type ProgressSnapshot } from "./progress";

const Z = "Europe/London";
const DAY = "2026-11-12";
const at = (day: string, hh = 12, mm = 0) => instantFromLocal(day, { hour: hh, minute: mm }, Z);

const catalog: Catalog = {
  quests: [
    { id: "gradient-descent", title: "Gradient Descent", tierIds: ["L1", "L2", "L3", "L4", "L5"], challengeIds: ["gd-loop", "grad-check"] },
    { id: "other-quest", title: "Other Quest", tierIds: ["L1", "L2"], challengeIds: ["c1"] },
  ],
  games: [{ id: "gradient-hiker", title: "Gradient Hiker", href: "/games/gradient-hiker/", levels: 5 }],
};

function play(events: [ProgressEvent, number][], from?: ProgressSnapshot) {
  let s = from ?? emptySnapshot(Z, at("2026-01-01"));
  const gains: number[] = [];
  for (const [e, t] of events) {
    const r = applyEvent(s, e, t, Z);
    s = r.snapshot;
    gains.push(r.xpGained);
  }
  return { s, gains };
}

const cardIds = ["a", "b", "c", "d", "e", "f", "g"];
const withCards = (day = DAY) => play([[{ type: "enroll-cards", topicId: "t", cardIds }, at(day, 8)]]).s;
const reviewOf = (n: number): ProgressEvent => ({
  type: "review-session",
  reviews: cardIds.slice(0, n).map((cardId) => ({ cardId, rating: "good" as const })),
});

describe("generateDailyQuest", () => {
  const snap = emptySnapshot(Z, at("2026-01-01"));

  it("always gives one step, one review and one build goal, in that order", () => {
    const q = generateDailyQuest(catalog, snap, DAY, Z);
    expect(q.date).toBe(DAY);
    expect(q.goals.map((g) => g.kind)).toEqual(["step", "review", "build"]);
    for (const g of q.goals) {
      expect(g.title.length).toBeGreaterThan(5);
      expect(g.href.startsWith("/")).toBe(true);
    }
  });

  it("is deterministic for a date and varies across dates", () => {
    expect(generateDailyQuest(catalog, snap, DAY, Z)).toEqual(generateDailyQuest(catalog, snap, DAY, Z));
    const titles = new Set(Array.from({ length: 30 }, (_, i) => generateDailyQuest(catalog, snap, addDays(DAY, i), Z).goals[0].title));
    expect(titles.size).toBeGreaterThan(3);
  });

  it("the step goal does not change once the learner completes that very tier today", () => {
    const before = generateDailyQuest(catalog, snap, DAY, Z).goals[0];
    const m = /tier (L\d)/.exec(before.title)!;
    const quest = catalog.quests.find((q) => before.title.includes(q.title))!;
    const after = play([[{ type: "step-complete", id: `${quest.id}:${m[1]}` }, at(DAY, 10)]], snap).s;
    expect(generateDailyQuest(catalog, after, DAY, Z).goals[0]).toEqual(before);
  });

  it("avoids tiers finished on an earlier day when others remain", () => {
    const done = play(
      ["L1", "L2", "L3", "L4"].map((t): [ProgressEvent, number] => [{ type: "step-complete", id: `gradient-descent:${t}` }, at("2026-11-01")]),
    ).s;
    for (let i = 0; i < 20; i++) {
      const g = generateDailyQuest(catalog, done, addDays(DAY, i), Z).goals[0];
      expect(/tier (L[1-4])$/.test(g.title) && g.title.includes("Gradient Descent")).toBe(false);
    }
  });

  it("falls back gracefully when every tier is done or the catalog is empty", () => {
    const empty = generateDailyQuest({ quests: [], games: [] }, snap, DAY, Z);
    expect(empty.goals.map((g) => g.kind)).toEqual(["step", "review", "build"]);
    const all = play(
      catalog.quests.flatMap((q) => q.tierIds.map((t): [ProgressEvent, number] => [{ type: "step-complete", id: `${q.id}:${t}` }, at("2026-11-01")])),
    ).s;
    expect(generateDailyQuest(catalog, all, DAY, Z).goals[0].title).toMatch(/tier L\d/);
  });

  it("the review goal tells the truth about flashcards", () => {
    expect(generateDailyQuest(catalog, snap, DAY, Z).goals[1].detail).toMatch(/no flashcards yet/);
    const due = generateDailyQuest(catalog, withCards(), DAY, Z).goals[1];
    expect(due.detail).toBe("7 cards are due today.");
    const none = generateDailyQuest(catalog, withCards(addDays(DAY, 5)), DAY, Z).goals[1];
    expect(none.detail).toMatch(/Nothing is due/);
    expect(due.title).toBe(`Review ${REVIEW_GOAL_CARDS} flashcards`);
  });

  it("the build goal offers unpassed challenges and the game, and skips ones already passed earlier", () => {
    const kinds = new Set<string>();
    for (let i = 0; i < 40; i++) kinds.add(generateDailyQuest(catalog, snap, addDays(DAY, i), Z).goals[2].title.split(" ")[0]!);
    expect(kinds.has("Pass")).toBe(true);
    expect(kinds.has("Play")).toBe(true);

    const passed = play(
      catalog.quests.flatMap((q) => q.challengeIds.map((c): [ProgressEvent, number] => [{ type: "challenge-run", id: `${q.id}:${c}`, passed: true, hintsUsed: 0 }, at("2026-11-01")])),
    ).s;
    for (let i = 0; i < 20; i++) expect(generateDailyQuest(catalog, passed, addDays(DAY, i), Z).goals[2].title).toMatch(/^Play /);
  });

  it("suggests a game level within the game's range, and says any win counts", () => {
    for (let i = 0; i < 40; i++) {
      const g = generateDailyQuest({ quests: [], games: catalog.games }, snap, addDays(DAY, i), Z).goals[2];
      expect(g.title).toBe("Play Gradient Hiker");
      const level = Number(/suggestion: level (\d+)/.exec(g.detail)![1]);
      expect(level).toBeGreaterThanOrEqual(1);
      expect(level).toBeLessThanOrEqual(5);
    }
  });
});

describe("evaluateDailyQuest", () => {
  const fresh = emptySnapshot(Z, at("2026-01-01"));

  it("starts with nothing done", () => {
    expect(evaluateDailyQuest(fresh, DAY, Z)).toEqual({ step: false, review: { done: false, cards: 0 }, build: false, complete: false, claimed: false });
  });

  it("a tier finished today counts as the step", () => {
    const s = play([[{ type: "step-complete", id: "x:L1" }, at(DAY, 9)]]).s;
    expect(evaluateDailyQuest(s, DAY, Z).step).toBe(true);
    expect(evaluateDailyQuest(s, addDays(DAY, 1), Z).step).toBe(false);
  });

  it("review needs 5 cards in total, which may come from more than one session", () => {
    let s = withCards();
    s = play([[reviewOf(3), at(DAY, 10)]], s).s;
    expect(evaluateDailyQuest(s, DAY, Z).review).toEqual({ done: false, cards: 3 });
    s = play([[reviewOf(2), at(DAY, 11)]], s).s;
    expect(evaluateDailyQuest(s, DAY, Z).review).toEqual({ done: true, cards: 5 });
  });

  it("a challenge pass or a game win counts as the build goal; a failed run does not", () => {
    const failed = play([[{ type: "challenge-run", id: "q:c", passed: false, hintsUsed: 0 }, at(DAY)], [{ type: "game-result", id: "g", won: false }, at(DAY)]]).s;
    expect(evaluateDailyQuest(failed, DAY, Z).build).toBe(false);
    expect(evaluateDailyQuest(play([[{ type: "challenge-run", id: "q:c", passed: true, hintsUsed: 0 }, at(DAY)]]).s, DAY, Z).build).toBe(true);
    expect(evaluateDailyQuest(play([[{ type: "game-result", id: "g", won: true }, at(DAY)]]).s, DAY, Z).build).toBe(true);
  });

  it("uses local midnight: something done at 23:50 does not count tomorrow", () => {
    const s = play([[{ type: "game-result", id: "g", won: true }, at(DAY, 23, 50)]]).s;
    expect(evaluateDailyQuest(s, DAY, Z).build).toBe(true);
    expect(evaluateDailyQuest(s, addDays(DAY, 1), Z).build).toBe(false);
  });

  it("is not tricked by a step done yesterday", () => {
    const s = play([[{ type: "step-complete", id: "x:L1" }, at(addDays(DAY, -1), 23, 59)]]).s;
    expect(evaluateDailyQuest(s, DAY, Z).step).toBe(false);
  });
});

describe("claiming the bonus", () => {
  const doAll = (): ProgressSnapshot => {
    const s0 = withCards();
    return play(
      [
        [{ type: "step-complete", id: "x:L1" }, at(DAY, 9)],
        [reviewOf(5), at(DAY, 10)],
        [{ type: "game-result", id: "g", won: true }, at(DAY, 11)],
      ],
      s0,
    ).s;
  };

  it("pays nothing until all three goals are done", () => {
    for (const events of [
      [[{ type: "step-complete", id: "x:L1" }, at(DAY, 9)]],
      [[{ type: "step-complete", id: "x:L1" }, at(DAY, 9)], [{ type: "game-result", id: "g", won: true }, at(DAY, 10)]],
    ] as [ProgressEvent, number][][]) {
      const s = play(events, withCards()).s;
      expect(play([[{ type: "daily-quest-claim" }, at(DAY, 20)]], s).gains[0]).toBe(0);
    }
  });

  it("pays 25 XP once all three are done, and only once a day", () => {
    const s = doAll();
    expect(evaluateDailyQuest(s, DAY, Z).complete).toBe(true);
    const first = play([[{ type: "daily-quest-claim" }, at(DAY, 20)]], s);
    expect(first.gains[0]).toBe(25);
    expect(evaluateDailyQuest(first.s, DAY, Z).claimed).toBe(true);
    const second = play([[{ type: "daily-quest-claim" }, at(DAY, 21)]], first.s);
    expect(second.gains[0]).toBe(0);
    expect(second.s.xpTotal).toBe(first.s.xpTotal);
  });

  it("a claim on a later day needs that day's goals", () => {
    const claimed = play([[{ type: "daily-quest-claim" }, at(DAY, 20)]], doAll()).s;
    const nextDay = play([[{ type: "daily-quest-claim" }, at(addDays(DAY, 1), 9)]], claimed);
    expect(nextDay.gains[0]).toBe(0);
  });

  it("claiming is not itself streak activity", () => {
    const s = doAll();
    const after = play([[{ type: "daily-quest-claim" }, at(DAY, 20)]], s).s;
    expect(after.streak).toEqual(s.streak);
  });

  it("writes a ledger entry for the day, which is how it is remembered", () => {
    const after = play([[{ type: "daily-quest-claim" }, at(DAY, 20)]], doAll()).s;
    const entry = after.ledger.at(-1)!;
    expect(entry).toMatchObject({ kind: "daily-quest", xp: 25, ref: DAY });
  });
});
