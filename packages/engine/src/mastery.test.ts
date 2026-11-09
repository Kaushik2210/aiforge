import { describe, expect, it } from "vitest";
import { addDays } from "./dates";
import {
  MASTERY_WEIGHTS,
  masteryLabel,
  quizScore,
  retentionScore,
  sectionMastery,
  topicMastery,
} from "./mastery";
import { newCard, review, type Card } from "./srs";

const TODAY = "2026-03-01";

/** A card reviewed `n` times "good" on schedule, ending today. */
function learned(id: string, goodReviews: number): Card {
  let card = newCard(id, "t", addDays(TODAY, -60));
  for (let i = 0; i < goodReviews; i++) card = review(card, "good", card.due <= TODAY ? card.due : TODAY);
  return card;
}

describe("weights", () => {
  it("add up to 1 so 100% is reachable and no more", () => {
    expect(MASTERY_WEIGHTS.quiz + MASTERY_WEIGHTS.retention + MASTERY_WEIGHTS.boss).toBeCloseTo(1, 10);
  });
});

describe("quizScore", () => {
  it("is 0 with no attempts", () => expect(quizScore({ correct: 0, attempts: 0 })).toBe(0));

  it("one lucky answer is not 100%", () => {
    expect(quizScore({ correct: 1, attempts: 1 })).toBeLessThan(0.1);
  });

  it("grows with evidence and accuracy", () => {
    const few = quizScore({ correct: 3, attempts: 3 });
    const many = quizScore({ correct: 10, attempts: 10 });
    expect(many).toBeGreaterThan(few);
    expect(many).toBeLessThan(1); // smoothing keeps it under 1
    expect(quizScore({ correct: 10, attempts: 10 })).toBeGreaterThan(quizScore({ correct: 5, attempts: 10 }));
  });

  it("never exceeds 1 and tolerates nonsense", () => {
    expect(quizScore({ correct: 500, attempts: 100 })).toBeLessThanOrEqual(1);
    expect(quizScore({ correct: -5, attempts: 10 })).toBeGreaterThanOrEqual(0);
    expect(quizScore({ correct: NaN, attempts: NaN })).toBe(0);
  });
});

describe("retentionScore", () => {
  it("is 0 with no cards or only unseen cards", () => {
    expect(retentionScore([], TODAY)).toBe(0);
    expect(retentionScore([newCard("a", "t", TODAY), newCard("b", "t", TODAY)], TODAY)).toBe(0);
  });

  it("unseen cards pull the average down", () => {
    const seen = learned("a", 3);
    const all = retentionScore([seen, newCard("b", "t", TODAY)], TODAY);
    expect(all).toBeCloseTo(retentionScore([seen], TODAY) / 2, 10);
  });

  it("falls as time passes without review", () => {
    const c = learned("a", 3);
    expect(retentionScore([c], addDays(TODAY, 90))).toBeLessThan(retentionScore([c], TODAY));
  });
});

describe("topicMastery", () => {
  const nothing = { quiz: { correct: 0, attempts: 0 }, cards: [], bossBest: null };

  it("is 0 and Unseen with no evidence", () => {
    expect(topicMastery(nothing, TODAY)).toMatchObject({ percent: 0, label: "Unseen" });
  });

  it("a boss alone is worth at most its weight", () => {
    const m = topicMastery({ ...nothing, bossBest: 1 }, TODAY);
    expect(m.percent).toBe(40);
  });

  it("quiz alone, even perfect, stays well below mastery", () => {
    const m = topicMastery({ ...nothing, quiz: { correct: 50, attempts: 50 } }, TODAY);
    expect(m.percent).toBeLessThanOrEqual(25); // capped by the quiz weight
    expect(m.label).not.toBe("Mastered");
  });

  it("all three together can reach Mastered", () => {
    const cards = Array.from({ length: 5 }, (_, i) => learned(`c${i}`, 4));
    const m = topicMastery({ quiz: { correct: 12, attempts: 12 }, cards, bossBest: 1 }, TODAY);
    expect(m.percent).toBeGreaterThanOrEqual(90);
    expect(m.label).toBe("Mastered");
  });

  it("more evidence never lowers mastery", () => {
    const base = { quiz: { correct: 4, attempts: 5 }, cards: [learned("a", 2)], bossBest: 0.5 as number | null };
    const before = topicMastery(base, TODAY).percent;
    expect(topicMastery({ ...base, bossBest: 0.9 }, TODAY).percent).toBeGreaterThanOrEqual(before);
    expect(topicMastery({ ...base, quiz: { correct: 9, attempts: 10 } }, TODAY).percent).toBeGreaterThanOrEqual(before);
  });

  it("stays within 0..100 whatever the input", () => {
    for (const boss of [-1, 0, 0.3, 1, 5, NaN]) {
      const p = topicMastery({ ...nothing, bossBest: boss }, TODAY).percent;
      expect(p).toBeGreaterThanOrEqual(0);
      expect(p).toBeLessThanOrEqual(100);
    }
  });
});

describe("labels and sections", () => {
  it("maps percent bands to labels at the boundaries", () => {
    expect(masteryLabel(0)).toBe("Unseen");
    expect(masteryLabel(1)).toBe("Learning");
    expect(masteryLabel(39)).toBe("Learning");
    expect(masteryLabel(40)).toBe("Familiar");
    expect(masteryLabel(70)).toBe("Solid");
    expect(masteryLabel(89)).toBe("Solid");
    expect(masteryLabel(90)).toBe("Mastered");
    expect(masteryLabel(100)).toBe("Mastered");
  });

  it("section mastery averages topics, counting untouched ones as 0", () => {
    expect(sectionMastery([])).toBe(0);
    expect(sectionMastery([100, 0, 50])).toBe(50);
    expect(sectionMastery([80, 90])).toBe(85);
  });
});
