import { describe, expect, it } from "vitest";
import { addDays, instantFromLocal } from "./dates";
import {
  MAX_LEDGER,
  SCHEMA_VERSION,
  applyEvent,
  emptySnapshot,
  exportProgress,
  mergeSnapshots,
  migrate,
  parseExport,
  validateSnapshot,
  type ProgressEvent,
  type ProgressSnapshot,
} from "./progress";
import { levelFromXp } from "./xp";

const Z = "Europe/London";
const at = (day: string, hh = 12) => instantFromLocal(day, { hour: hh }, Z);

function run(events: [ProgressEvent, number][], from?: ProgressSnapshot) {
  let s = from ?? emptySnapshot(Z, at("2026-01-01"));
  const results = [];
  for (const [e, t] of events) {
    const r = applyEvent(s, e, t, Z);
    s = r.snapshot;
    results.push(r);
  }
  return { s, results };
}

describe("emptySnapshot", () => {
  it("is valid, current-version and has no progress", () => {
    const s = emptySnapshot(Z, 1_000);
    expect(validateSnapshot(s)).toEqual({ ok: true, snapshot: s });
    expect(s).toMatchObject({ schemaVersion: SCHEMA_VERSION, xpTotal: 0, ledger: [] });
  });
});

describe("steps and the streak", () => {
  it("first completion pays full XP, repeats pay little, both count as activity", () => {
    const { s, results } = run([
      [{ type: "step-complete", id: "gd:L1" }, at("2026-01-02")],
      [{ type: "step-complete", id: "gd:L1" }, at("2026-01-03")],
    ]);
    expect(results[0]!.xpGained).toBe(10);
    expect(results[1]!.xpGained).toBe(2);
    expect(s.steps["gd:L1"]).toBe(at("2026-01-02"));
    expect(s.streak.current).toBe(2);
  });

  it("does not mutate the previous snapshot", () => {
    const s0 = emptySnapshot(Z, 1);
    const before = JSON.stringify(s0);
    applyEvent(s0, { type: "step-complete", id: "x" }, at("2026-01-02"), Z);
    expect(JSON.stringify(s0)).toBe(before);
  });

  it("a streak milestone and a comeback add XP and ledger entries", () => {
    const week = Array.from({ length: 7 }, (_, i): [ProgressEvent, number] => [
      { type: "step-complete", id: `s${i}` }, at(addDays("2026-02-01", i)),
    ]);
    const { s, results } = run(week);
    expect(results[6]!.xpGained).toBe(10 + 14); // step + 7-day milestone
    expect(s.ledger.some((l) => l.kind === "streak")).toBe(true);
    const back = run([[{ type: "step-complete", id: "later" }, at("2026-04-01")]], s);
    expect(back.results[0]!.streakEvents.map((e) => e.type)).toContain("comeback");
    expect(back.results[0]!.xpGained).toBe(10 + 25);
    expect(back.s.streak.longest).toBe(7);
  });
});

describe("quizzes", () => {
  it("pays only for the first correct answer to an item and tallies attempts", () => {
    const { s, results } = run([
      [{ type: "quiz-answer", topicId: "gd", itemId: "q1", correct: false }, at("2026-01-02")],
      [{ type: "quiz-answer", topicId: "gd", itemId: "q1", correct: true }, at("2026-01-02")],
      [{ type: "quiz-answer", topicId: "gd", itemId: "q1", correct: true }, at("2026-01-02")],
    ]);
    expect(results.map((r) => r.xpGained)).toEqual([0, 5, 0]);
    expect(s.quiz.gd).toEqual({ attempts: 3, correct: 2, items: { q1: true } });
  });

  it("answering a quiz does not count as streak activity", () => {
    const { s } = run([[{ type: "quiz-answer", topicId: "gd", itemId: "q1", correct: true }, at("2026-01-02")]]);
    expect(s.streak.current).toBe(0);
  });
});

describe("challenges", () => {
  it("hints reduce first-pass XP; a pass counts for the streak", () => {
    const { s, results } = run([
      [{ type: "challenge-run", id: "gd-loop", passed: false, hintsUsed: 2 }, at("2026-01-02")],
      [{ type: "challenge-run", id: "gd-loop", passed: true, hintsUsed: 2 }, at("2026-01-02")],
      [{ type: "challenge-run", id: "gd-loop", passed: true, hintsUsed: 0 }, at("2026-01-02")],
    ]);
    expect(results.map((r) => r.xpGained)).toEqual([0, 30 + 0, 5]); // first pass 40-2*5=30 ; repeat 5
    expect(s.challenges["gd-loop"]).toMatchObject({ attempts: 3, passed: true, bestHints: 0 });
    expect(s.streak.current).toBe(1);
  });

  it("a failed run records an attempt but no XP or activity", () => {
    const { s, results } = run([[{ type: "challenge-run", id: "c", passed: false, hintsUsed: 0 }, at("2026-01-02")]]);
    expect(results[0]!.xpGained).toBe(0);
    expect(s.challenges.c).toMatchObject({ attempts: 1, passed: false, firstPassAt: null });
    expect(s.streak.current).toBe(0);
  });
});

describe("bosses and games", () => {
  it("boss pays only at 80%, first clear pays most, best score is kept", () => {
    const { s, results } = run([
      [{ type: "boss-result", id: "b", score: 0.6 }, at("2026-01-02")],
      [{ type: "boss-result", id: "b", score: 0.85 }, at("2026-01-02")],
      [{ type: "boss-result", id: "b", score: 0.95 }, at("2026-01-02")],
      [{ type: "boss-result", id: "b", score: 0.5 }, at("2026-01-02")],
    ]);
    expect(results.map((r) => r.xpGained)).toEqual([0, 100, 20, 0]);
    expect(s.bosses.b!.best).toBe(0.95);
    expect(s.bosses.b!.attempts).toBe(4);
    expect(s.bosses.b!.clearedAt).toBe(at("2026-01-02"));
  });

  it("game wins pay once at full value", () => {
    const { results } = run([
      [{ type: "game-result", id: "hiker", won: false }, at("2026-01-02")],
      [{ type: "game-result", id: "hiker", won: true }, at("2026-01-02")],
      [{ type: "game-result", id: "hiker", won: true }, at("2026-01-02")],
    ]);
    expect(results.map((r) => r.xpGained)).toEqual([0, 30, 5]);
  });
});

describe("flashcards in the snapshot", () => {
  const ids = ["a", "b", "c", "d", "e", "f"];

  it("enrolling adds cards due today and never resets existing ones", () => {
    const first = run([[{ type: "enroll-cards", topicId: "gd", cardIds: ids }, at("2026-01-02")]]);
    expect(Object.keys(first.s.cards)).toHaveLength(6);
    expect(first.s.cards.a).toMatchObject({ topicId: "gd", due: "2026-01-02", lastReviewed: null });
    const reviewed = run([[{ type: "review-session", reviews: [{ cardId: "a", rating: "good" }] }, at("2026-01-02")]], first.s);
    const again = run([[{ type: "enroll-cards", topicId: "gd", cardIds: ids }, at("2026-01-05")]], reviewed.s);
    expect(again.s.cards.a!.reps).toBe(1);
  });

  it("a session of 5+ cards counts for the streak, fewer does not", () => {
    const enrolled = run([[{ type: "enroll-cards", topicId: "gd", cardIds: ids }, at("2026-01-02")]]).s;
    const four = run([[{ type: "review-session", reviews: ids.slice(0, 4).map((cardId) => ({ cardId, rating: "good" as const })) }, at("2026-01-02")]], enrolled);
    expect(four.s.streak.current).toBe(0);
    const five = run([[{ type: "review-session", reviews: ids.slice(0, 5).map((cardId) => ({ cardId, rating: "good" as const })) }, at("2026-01-02")]], enrolled);
    expect(five.s.streak.current).toBe(1);
    expect(five.results[0]!.xpGained).toBe(10);
  });

  it("unknown card ids in a review are ignored, not invented", () => {
    const { s } = run([[{ type: "review-session", reviews: [{ cardId: "ghost", rating: "good" }] }, at("2026-01-02")]]);
    expect(s.cards).toEqual({});
  });
});

describe("level and rank changes", () => {
  it("reports a level-up when XP crosses a threshold", () => {
    let s = emptySnapshot(Z, 1);
    s = { ...s, xpTotal: 95 };
    const r = applyEvent(s, { type: "step-complete", id: "x" }, at("2026-01-02"), Z);
    expect(levelFromXp(95)).toBe(1);
    expect(r.levelUp).toEqual({ from: 1, to: 2 });
    expect(r.rankUp).toBeNull();
  });

  it("reports a rank-up", () => {
    const s = { ...emptySnapshot(Z, 1), xpTotal: 545 }; // level 4; +10 XP crosses 550 = level 5 = Apprentice
    const r = applyEvent(s, { type: "step-complete", id: "x" }, at("2026-01-02"), Z);
    expect(r.rankUp).toEqual({ from: "Initiate", to: "Apprentice" });
  });
});

describe("ledger", () => {
  it("keeps only the most recent entries but the total stays exact", () => {
    const events = Array.from({ length: MAX_LEDGER + 50 }, (_, i): [ProgressEvent, number] => [
      { type: "step-complete", id: `s${i}` }, at("2026-01-02", 8) + i,
    ]);
    const { s } = run(events);
    expect(s.ledger).toHaveLength(MAX_LEDGER);
    expect(s.xpTotal).toBe((MAX_LEDGER + 50) * 10);
  });
});

describe("unsafe ids", () => {
  it.each(["__proto__", "constructor", "prototype", ""])("rejects id %j", (id) => {
    expect(() => applyEvent(emptySnapshot(Z, 1), { type: "step-complete", id }, 1, Z)).toThrow(RangeError);
  });
});

describe("export and import", () => {
  const built = run([
    [{ type: "step-complete", id: "gd:L1" }, at("2026-01-02")],
    [{ type: "quiz-answer", topicId: "gd", itemId: "q1", correct: true }, at("2026-01-02")],
    [{ type: "challenge-run", id: "gd-loop", passed: true, hintsUsed: 1 }, at("2026-01-02")],
    [{ type: "boss-result", id: "b", score: 0.9 }, at("2026-01-02")],
    [{ type: "enroll-cards", topicId: "gd", cardIds: ["a", "b"] }, at("2026-01-02")],
    [{ type: "game-result", id: "hiker", won: true }, at("2026-01-02")],
  ]).s;

  it("round-trips through the exported file text", () => {
    const text = JSON.stringify(exportProgress(built, 123));
    expect(parseExport(text)).toEqual({ ok: true, snapshot: built });
  });

  it("rejects text that is not JSON or not our file", () => {
    expect(parseExport("{nope")).toMatchObject({ ok: false });
    expect(parseExport(JSON.stringify({ kind: "something-else", snapshot: built }))).toMatchObject({ ok: false });
    expect(parseExport("[]")).toMatchObject({ ok: false });
  });

  it("rejects a file from a newer app version with a clear message", () => {
    const res = parseExport(JSON.stringify({ kind: "aiforge-progress", snapshot: { ...built, schemaVersion: 99 } }));
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.errors[0]).toMatch(/newer version/);
  });

  const tamper: [string, (s: Record<string, any>) => void][] = [
    ["negative XP", (s) => { s.xpTotal = -5; }],
    ["fractional XP", (s) => { s.xpTotal = 1.5; }],
    ["absurd XP", (s) => { s.xpTotal = 1e15; }],
    ["quiz correct above attempts", (s) => { s.quiz.gd.correct = 99; }],
    ["boss score above 1", (s) => { s.bosses.b.best = 7; }],
    ["card ease out of range", (s) => { s.cards.a.ease = 99; }],
    ["card interval too long", (s) => { s.cards.a.interval = 5000; }],
    ["card with bad date", (s) => { s.cards.a.due = "someday"; }],
    ["card id mismatch", (s) => { s.cards.a.id = "zzz"; }],
    ["game wins above plays", (s) => { s.games.hiker.wins = 9; }],
    ["streak with no activity", (s) => { s.streak.lastActiveAt = null; s.streak.lastActiveDay = null; }],
    ["ledger not a list", (s) => { s.ledger = "lots"; }],
    ["step with a text time", (s) => { s.steps["gd:L1"] = "yesterday"; }],
    ["wrong container type", (s) => { s.cards = []; }],
  ];
  it.each(tamper)("rejects tampering: %s", (_n, mutate) => {
    const copy = JSON.parse(JSON.stringify(built));
    mutate(copy);
    expect(validateSnapshot(copy).ok).toBe(false);
  });

  it("rejects a prototype-pollution key and does not pollute", () => {
    const text = `{"kind":"aiforge-progress","snapshot":${JSON.stringify(built).replace('"steps":{', '"steps":{"__proto__":123,')}}`;
    expect(parseExport(text).ok).toBe(false);
    expect(({} as Record<string, unknown>).polluted).toBeUndefined();
    expect(Object.prototype.hasOwnProperty.call(Object.prototype, "123")).toBe(false);
  });

  it("drops unknown top-level fields instead of keeping them", () => {
    const res = validateSnapshot({ ...built, hacked: { evil: true } });
    expect(res.ok && "hacked" in res.snapshot).toBe(false);
  });
});

describe("migrations", () => {
  it("runs a chain of migrations in order and stamps the new version", () => {
    const registry = {
      1: (d: Record<string, unknown>) => ({ ...d, a: "one" }),
      2: (d: Record<string, unknown>) => ({ ...d, b: (d.a as string) + "-two" }),
    };
    const res = migrate({ schemaVersion: 1, x: 1 }, registry, 3);
    expect(res).toEqual({ ok: true, data: { schemaVersion: 3, x: 1, a: "one", b: "one-two" } });
  });

  it("does nothing when already current", () => {
    expect(migrate({ schemaVersion: SCHEMA_VERSION, k: 1 })).toEqual({ ok: true, data: { schemaVersion: SCHEMA_VERSION, k: 1 } });
  });

  it("refuses newer data and reports a missing step", () => {
    expect(migrate({ schemaVersion: 5 }, {}, 3).ok).toBe(false);
    expect(migrate({ schemaVersion: 1 }, {}, 2)).toEqual({ ok: false, error: "no migration from schema 1" });
  });

  it("rejects junk versions", () => {
    for (const bad of [{}, { schemaVersion: "1" }, { schemaVersion: 0 }, { schemaVersion: 1.5 }, null, 7]) {
      expect(migrate(bad).ok).toBe(false);
    }
  });

  it("does not mutate the input", () => {
    const input = { schemaVersion: 1, k: 1 };
    migrate(input, { 1: (d) => ({ ...d, extra: true }) }, 2);
    expect(input).toEqual({ schemaVersion: 1, k: 1 });
  });
});

describe("mergeSnapshots", () => {
  const phone = run([
    [{ type: "step-complete", id: "s1" }, at("2026-01-02")],
    [{ type: "quiz-answer", topicId: "gd", itemId: "q1", correct: true }, at("2026-01-02")],
    [{ type: "boss-result", id: "b", score: 0.6 }, at("2026-01-02")],
    [{ type: "challenge-run", id: "c", passed: true, hintsUsed: 3 }, at("2026-01-02")],
  ]).s;
  const laptop = run([
    [{ type: "step-complete", id: "s1" }, at("2026-01-05")],
    [{ type: "step-complete", id: "s2" }, at("2026-01-05")],
    [{ type: "quiz-answer", topicId: "gd", itemId: "q2", correct: true }, at("2026-01-05")],
    [{ type: "boss-result", id: "b", score: 0.9 }, at("2026-01-05")],
    [{ type: "challenge-run", id: "c", passed: true, hintsUsed: 0 }, at("2026-01-05")],
  ]).s;

  it("keeps the best of both and is symmetric", () => {
    const m = mergeSnapshots(phone, laptop);
    expect(Object.keys(m.steps).sort()).toEqual(["s1", "s2"]);
    expect(m.steps.s1).toBe(at("2026-01-02")); // earliest completion
    expect(m.bosses.b!.best).toBe(0.9);
    expect(m.challenges.c!.bestHints).toBe(0);
    expect(m.quiz.gd!.items).toEqual({ q1: true, q2: true });
    expect(m.xpTotal).toBe(Math.max(phone.xpTotal, laptop.xpTotal));
    expect(validateSnapshot(m).ok).toBe(true);
    expect(mergeSnapshots(laptop, phone).bosses).toEqual(m.bosses);
    expect(mergeSnapshots(laptop, phone).steps).toEqual(m.steps);
  });

  it("merging with an empty snapshot changes nothing important", () => {
    const m = mergeSnapshots(emptySnapshot(Z, 5), laptop);
    expect(m.xpTotal).toBe(laptop.xpTotal);
    expect(m.bosses).toEqual(laptop.bosses);
  });
});
