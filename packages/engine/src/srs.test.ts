import { describe, expect, it } from "vitest";
import { addDays } from "./dates";
import {
  INITIAL_EASE,
  LEECH_LAPSES,
  MAX_INTERVAL_DAYS,
  MIN_EASE,
  buildReviewQueue,
  isDue,
  isLeech,
  newCard,
  retrievability,
  review,
  sm2EaseDelta,
  type Card,
  type Rating,
} from "./srs";

const D0 = "2026-01-01";

/** Review a card on its due date, repeatedly, with the given ratings. */
function path(ratings: Rating[], start: Card = newCard("c", "t", D0)) {
  const trail: Card[] = [];
  let card = start;
  for (const r of ratings) {
    card = review(card, r, card.due);
    trail.push(card);
  }
  return trail;
}

describe("SM-2 easiness factor (matches the original formula)", () => {
  it("gives the published deltas for q = 0..5", () => {
    const expected = [-0.8, -0.54, -0.32, -0.14, 0, 0.1];
    for (let q = 0; q <= 5; q++) expect(sm2EaseDelta(q)).toBeCloseTo(expected[q]!, 10);
  });

  it("equals the reduced form EF - 0.8 + 0.28q - 0.02q^2", () => {
    for (let q = 0; q <= 5; q++) {
      expect(sm2EaseDelta(q)).toBeCloseTo(-0.8 + 0.28 * q - 0.02 * q * q, 10);
    }
  });
});

describe("intervals", () => {
  it("a new card is due immediately with the initial ease", () => {
    const c = newCard("c", "t", D0);
    expect(c).toMatchObject({ ease: INITIAL_EASE, interval: 0, reps: 0, lapses: 0, due: D0, lastReviewed: null });
    expect(isDue(c, D0)).toBe(true);
    expect(isDue(c, addDays(D0, -1))).toBe(false);
  });

  it("good, good, good: 1 day, 6 days, then times the ease rounded up", () => {
    const [a, b, c, d] = path(["good", "good", "good", "good"]);
    expect([a!.interval, b!.interval, c!.interval, d!.interval]).toEqual([1, 6, 15, 38]); // 6*2.5, 15*2.5=37.5 -> 38
    expect(c!.ease).toBe(2.5); // q=4 leaves the ease alone
    expect(c!.due).toBe(addDays(b!.due, 15));
  });

  it("easy raises the ease by 0.1 each time and grows faster", () => {
    const [a, b, c] = path(["easy", "easy", "easy"]);
    expect([a!.ease, b!.ease, c!.ease]).toEqual([2.6, 2.7, 2.8]);
    expect(c!.interval).toBe(Math.ceil(6 * 2.8)); // 17
  });

  it("hard lowers the ease but never below 1.3", () => {
    const trail = path(Array<Rating>(30).fill("hard"));
    expect(trail[0]!.ease).toBeCloseTo(2.36, 10);
    expect(trail.at(-1)!.ease).toBe(MIN_EASE);
    for (const c of trail) expect(c.ease).toBeGreaterThanOrEqual(MIN_EASE);
  });

  it("intervals never exceed one year", () => {
    const trail = path(Array<Rating>(25).fill("easy"));
    expect(Math.max(...trail.map((c) => c.interval))).toBe(MAX_INTERVAL_DAYS);
    expect(trail.at(-1)!.interval).toBe(MAX_INTERVAL_DAYS);
  });

  it("intervals are whole days and due dates move forward", () => {
    let prevDue = D0;
    for (const c of path(["good", "easy", "good", "hard", "good", "good"])) {
      expect(Number.isInteger(c.interval)).toBe(true);
      expect(c.due >= prevDue).toBe(true);
      prevDue = c.due;
    }
  });
});

describe("lapses", () => {
  it("again restarts the schedule at 1 day and leaves the ease alone", () => {
    const [, , c] = path(["good", "good", "good"]);
    const lapsed = review(c!, "again", c!.due);
    expect(lapsed).toMatchObject({ reps: 0, interval: 1, lapses: 1, ease: c!.ease });
    expect(lapsed.due).toBe(addDays(c!.due, 1));
  });

  it("after a lapse the schedule starts over: 1 day then 6 days", () => {
    const trail = path(["good", "good", "good", "again", "good", "good"]);
    expect(trail.slice(3).map((c) => c.interval)).toEqual([1, 1, 6]);
  });

  it("failing a brand-new card is not counted as a lapse", () => {
    expect(review(newCard("c", "t", D0), "again", D0).lapses).toBe(0);
  });

  it("leech after repeated lapses", () => {
    let card = newCard("c", "t", D0);
    for (let i = 0; i < LEECH_LAPSES; i++) {
      card = review(card, "good", card.due);
      card = review(card, "again", card.due);
    }
    expect(card.lapses).toBe(LEECH_LAPSES);
    expect(isLeech(card)).toBe(true);
    expect(isLeech(newCard("c", "t", D0))).toBe(false);
  });
});

describe("review is pure and flexible about timing", () => {
  it("does not mutate the input card", () => {
    const c = Object.freeze(newCard("c", "t", D0));
    expect(() => review(c, "good", D0)).not.toThrow();
    expect(c.reps).toBe(0);
  });

  it("an early or late review schedules from the day you actually review", () => {
    const c = review(newCard("c", "t", D0), "good", D0); // due Jan 2
    const early = review(c, "good", "2026-01-01");
    const late = review(c, "good", "2026-01-20");
    expect(early.due).toBe(addDays("2026-01-01", 6));
    expect(late.due).toBe(addDays("2026-01-20", 6));
  });
});

describe("retrievability", () => {
  it("is 0 for a card never reviewed", () => {
    expect(retrievability(newCard("c", "t", D0), D0)).toBe(0);
  });

  it("is 1 on the review day and 0.9 when the interval has elapsed", () => {
    const c = review(review(newCard("c", "t", D0), "good", D0), "good", "2026-01-02"); // interval 6
    expect(retrievability(c, "2026-01-02")).toBe(1);
    expect(retrievability(c, "2026-01-08")).toBeCloseTo(0.9, 10);
  });

  it("falls steadily with time and stays within 0..1", () => {
    const c = review(review(newCard("c", "t", D0), "good", D0), "good", "2026-01-02");
    let last = 1;
    for (let n = 0; n < 200; n++) {
      const r = retrievability(c, addDays("2026-01-02", n));
      expect(r).toBeLessThanOrEqual(last);
      expect(r).toBeGreaterThanOrEqual(0);
      last = r;
    }
  });
});

describe("buildReviewQueue", () => {
  const mk = (id: string, topic: string, due: string, reviewed = true): Card => ({
    ...newCard(id, topic, due),
    due,
    interval: reviewed ? 3 : 0,
    lastReviewed: reviewed ? addDays(due, -3) : null,
  });
  const today = "2026-02-10";

  it("contains only due cards", () => {
    const q = buildReviewQueue([mk("a", "t", today), mk("b", "t", "2026-02-11"), mk("c", "t", "2026-02-01")], today);
    expect(q.map((c) => c.id).sort()).toEqual(["a", "c"]);
  });

  it("puts the most overdue card first within a topic", () => {
    const q = buildReviewQueue([mk("a", "t", "2026-02-09"), mk("b", "t", "2026-02-01"), mk("c", "t", today)], today);
    expect(q.map((c) => c.id)).toEqual(["b", "a", "c"]);
  });

  it("interleaves topics round-robin instead of blocking them", () => {
    const cards = [
      mk("a1", "A", "2026-02-01"), mk("a2", "A", "2026-02-02"), mk("a3", "A", "2026-02-03"),
      mk("b1", "B", "2026-02-01"), mk("b2", "B", "2026-02-02"),
      mk("c1", "C", "2026-02-01"),
    ];
    const q = buildReviewQueue(cards, today, { seed: 7 });
    expect(q).toHaveLength(6);
    // no topic appears three times in a row, and the first three cards cover all topics
    expect(new Set(q.slice(0, 3).map((c) => c.topicId)).size).toBe(3);
    for (let i = 2; i < q.length; i++) {
      expect(q[i]!.topicId === q[i - 1]!.topicId && q[i]!.topicId === q[i - 2]!.topicId).toBe(false);
    }
  });

  it("respects the session limit", () => {
    const cards = Array.from({ length: 30 }, (_, i) => mk(`c${String(i).padStart(2, "0")}`, `t${i % 3}`, "2026-02-01"));
    expect(buildReviewQueue(cards, today, { limit: 12 })).toHaveLength(12);
    expect(buildReviewQueue(cards, today)).toHaveLength(20);
    expect(buildReviewQueue(cards, today, { limit: 0 })).toHaveLength(0);
  });

  it("caps never-seen cards so a new quest cannot flood the session", () => {
    const fresh = Array.from({ length: 17 }, (_, i) => mk(`n${i}`, "new", today, false));
    const old = [mk("o1", "old", "2026-02-01"), mk("o2", "old", "2026-02-02")];
    const q = buildReviewQueue([...fresh, ...old], today, { maxNew: 5, limit: 50 });
    expect(q.filter((c) => c.lastReviewed === null)).toHaveLength(5);
    expect(q.filter((c) => c.lastReviewed !== null)).toHaveLength(2);
  });

  it("is deterministic for a seed and does not mutate its input", () => {
    const cards = [mk("a", "A", "2026-02-01"), mk("b", "B", "2026-02-01"), mk("c", "C", "2026-02-01")];
    const snapshot = JSON.stringify(cards);
    expect(buildReviewQueue(cards, today, { seed: 3 })).toEqual(buildReviewQueue(cards, today, { seed: 3 }));
    expect(JSON.stringify(cards)).toBe(snapshot);
  });

  it("returns nothing when nothing is due", () => {
    expect(buildReviewQueue([mk("a", "t", "2026-03-01")], today)).toEqual([]);
    expect(buildReviewQueue([], today)).toEqual([]);
  });
});
