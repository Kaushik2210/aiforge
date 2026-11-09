import { describe, expect, it } from "vitest";
import { LessonFrontmatterSchema, QuizItemSchema, SourcesSchema } from "./schemas";

const baseLesson = {
  id: "gradient-descent",
  title: "Gradient Descent",
  realm: 2,
  zone: "Calculus",
  estimatedMinutes: 90,
  verifiedOn: "2026-11-09",
  tiers: ["L1", "L2", "L3", "L4", "L5"],
  coreFundamentals: ["a long enough line", "another fundamental", "third fundamental"],
  coreComplexity: ["a hard thing here", "another hard thing", "third hard thing"],
  explainItBack: { prompt: "Explain it in your own words.", rubric: ["one point", "two point", "three point"] },
  miniGame: "gradient-hiker",
  bossId: "gradient-descent-boss",
};

describe("LessonFrontmatterSchema", () => {
  it("accepts a complete lesson", () => {
    expect(LessonFrontmatterSchema.safeParse(baseLesson).success).toBe(true);
  });

  it("rejects a missing tier that is not justified", () => {
    const res = LessonFrontmatterSchema.safeParse({ ...baseLesson, tiers: ["L1", "L2", "L3", "L4"] });
    expect(res.success).toBe(false);
  });

  it("accepts a skipped tier with a reason", () => {
    const res = LessonFrontmatterSchema.safeParse({
      ...baseLesson,
      tiers: ["L1", "L2", "L3", "L4"],
      skipTiers: [{ tier: "L5", reason: "No meaningful frontier for this topic." }],
    });
    expect(res.success).toBe(true);
  });

  it("rejects a malformed date", () => {
    expect(LessonFrontmatterSchema.safeParse({ ...baseLesson, verifiedOn: "9 Nov 2026" }).success).toBe(false);
  });
});

describe("QuizItemSchema", () => {
  const item = {
    id: "q-one",
    question: "What does the gradient point toward?",
    options: ["Steepest ascent", "Steepest descent", "Zero"],
    answer: 0,
    explanation: "The gradient points in the direction of steepest increase.",
    whyWrong: { "1": "That is the negative gradient.", "2": "Zero only at critical points." },
  };

  it("accepts a well-formed item", () => {
    expect(QuizItemSchema.safeParse(item).success).toBe(true);
  });

  it("requires an explanation for every wrong option", () => {
    const res = QuizItemSchema.safeParse({ ...item, whyWrong: { "1": "That is the negative gradient." } });
    expect(res.success).toBe(false);
  });
});

describe("SourcesSchema", () => {
  it("requires four primary sources", () => {
    const s = {
      title: "A source",
      url: "https://example.com",
      type: "paper",
      primary: true,
      verifiedOn: "2026-11-09",
      readFor: "reading for the main idea",
    };
    expect(SourcesSchema.safeParse([s, s, s]).success).toBe(false);
    expect(SourcesSchema.safeParse([s, s, s, s]).success).toBe(true);
  });
});
