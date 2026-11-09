import path from "node:path";
import { describe, expect, it } from "vitest";
import { parseHints, readChallenges } from "./validate";

const quest = path.resolve(__dirname, "../../../content/02-math-ml-foundations/gradient-descent");

describe("challenge loading", () => {
  it("parses numbered hints", () => {
    expect(parseHints("1. first\n2. second\nnot a hint\n3. third")).toEqual(["first", "second", "third"]);
  });

  it("loads both gradient descent challenges with 3 hints each", () => {
    const cs = readChallenges(quest);
    expect(cs.map((c) => c.id).sort()).toEqual(["gd-loop", "grad-check"]);
    for (const c of cs) {
      expect(c.hints).toHaveLength(3);
      expect(c.starter).toContain("NotImplementedError");
      expect(c.tests).toContain("SUBMISSION");
    }
  });

  it("includes hidden checks for every challenge", () => {
    for (const c of readChallenges(quest)) {
      expect(c.hiddenTests).toContain("def test_");
    }
  });

  it("never exposes the solution", () => {
    for (const c of readChallenges(quest)) {
      expect(Object.keys(c)).not.toContain("solution");
    }
  });
});
