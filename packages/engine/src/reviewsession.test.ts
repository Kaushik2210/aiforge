import { describe, expect, it } from "vitest";
import {
  RATINGS,
  answerCurrent,
  cardsDone,
  currentCard,
  formatInterval,
  isFinished,
  previewIntervals,
  sessionResult,
  startReviewSession,
} from "./reviewsession";
import { newCard, review, type Rating } from "./srs";

const TODAY = "2026-11-12";
const deck = (n: number) => Array.from({ length: n }, (_, i) => newCard(`c${i}`, "t", TODAY));

function run(n: number, ratings: Rating[]) {
  let s = startReviewSession(deck(n));
  for (const r of ratings) s = answerCurrent(s, r);
  return s;
}

describe("a sitting", () => {
  it("shows cards in order and finishes after every card is rated good", () => {
    let s = startReviewSession(deck(3));
    expect(currentCard(s)!.id).toBe("c0");
    s = answerCurrent(s, "good");
    expect(currentCard(s)!.id).toBe("c1");
    s = answerCurrent(answerCurrent(s, "easy"), "hard");
    expect(isFinished(s)).toBe(true);
    expect(currentCard(s)).toBeNull();
    expect(cardsDone(s)).toBe(3);
  });

  it("an empty deck is finished immediately", () => {
    const s = startReviewSession([]);
    expect(isFinished(s)).toBe(true);
    expect(sessionResult(s)).toEqual({ reviews: [], counts: { again: 0, hard: 0, good: 0, easy: 0 }, cardsReviewed: 0 });
  });

  it("ignores duplicate cards and answers after the end", () => {
    const d = deck(2);
    const s = startReviewSession([...d, d[0]!]);
    expect(s.total).toBe(2);
    const done = answerCurrent(answerCurrent(s, "good"), "good");
    expect(answerCurrent(done, "good")).toBe(done);
  });

  it("does not mutate the previous state", () => {
    const s = startReviewSession(deck(2));
    const copy = JSON.stringify(s);
    answerCurrent(s, "again");
    expect(JSON.stringify(s)).toBe(copy);
  });
});

describe('"again" and the retry', () => {
  it("sends the card to the end once, so the sitting is one card longer", () => {
    let s = startReviewSession(deck(3));
    s = answerCurrent(s, "again"); // c0 goes to the back
    expect(s.queue).toEqual(["c1", "c2", "c0"]);
    expect(cardsDone(s)).toBe(0);
    s = answerCurrent(answerCurrent(s, "good"), "good");
    expect(currentCard(s)!.id).toBe("c0");
    s = answerCurrent(s, "good"); // the retry
    expect(isFinished(s)).toBe(true);
  });

  it("only the first rating counts for scheduling, even if the retry goes well", () => {
    const s = run(2, ["again", "good", "easy"]); // c0 again, c1 good, c0 retry easy
    const r = sessionResult(s);
    expect(r.reviews.find((x) => x.cardId === "c0")!.rating).toBe("again");
    expect(r.reviews.find((x) => x.cardId === "c1")!.rating).toBe("good");
  });

  it("a second 'again' on the retry does not loop forever", () => {
    const s = run(1, ["again", "again"]);
    expect(isFinished(s)).toBe(true);
    expect(s.queue).toEqual([]);
  });

  it("a card rated hard or good is never repeated", () => {
    const s = run(3, ["hard", "good", "easy"]);
    expect(s.requeued).toEqual([]);
    expect(isFinished(s)).toBe(true);
  });
});

describe("the result", () => {
  it("counts each rating and lists every distinct card once", () => {
    const s = run(4, ["good", "again", "easy", "hard", "good"]); // c0 good, c1 again, c2 easy, c3 hard, c1 retry
    const r = sessionResult(s);
    expect(r.cardsReviewed).toBe(4);
    expect(r.counts).toEqual({ again: 1, hard: 1, good: 1, easy: 1 });
    expect(new Set(r.reviews.map((x) => x.cardId)).size).toBe(4);
  });

  it("only includes cards that were actually rated", () => {
    const s = startReviewSession(deck(5));
    const partway = answerCurrent(answerCurrent(s, "good"), "good");
    expect(sessionResult(partway).cardsReviewed).toBe(2);
  });

  it("the ratings it lists can be fed straight to the scheduler", () => {
    const s = run(2, ["good", "again", "good"]);
    const next = sessionResult(s).reviews.map((r) => review(s.cards[r.cardId]!, r.rating, TODAY));
    expect(next.map((c) => c.interval)).toEqual([1, 1]);
    expect(next.map((c) => c.lapses)).toEqual([0, 0]); // brand-new cards do not count as lapses
  });
});

describe("previewIntervals and formatInterval", () => {
  it("matches what the scheduler will actually do for each button", () => {
    const c = review(review(newCard("x", "t", TODAY), "good", TODAY), "good", TODAY); // interval 6
    const p = previewIntervals(c, TODAY);
    for (const r of RATINGS) expect(p[r]).toBe(review(c, r, TODAY).interval);
    expect(p.again).toBe(1);
    expect(p.easy).toBeGreaterThanOrEqual(p.good);
    expect(p.good).toBeGreaterThanOrEqual(p.hard);
  });

  it("formats days in plain words", () => {
    expect([0, 1, 6, 29, 30, 45, 90, 365, 400].map(formatInterval)).toEqual([
      "today", "1 day", "6 days", "29 days", "1 month", "2 months", "3 months", "1 year", "1 year",
    ]);
  });
});
