import path from "node:path";
import { describe, expect, it } from "vitest";
import { findQuestDirs, validateQuest } from "./validate";

const contentRoot = path.resolve(__dirname, "../../../content");

describe("reference content", () => {
  it("finds at least the gradient descent quest", () => {
    const dirs = findQuestDirs(contentRoot);
    expect(dirs.some((d) => d.endsWith("gradient-descent"))).toBe(true);
  });

  it("every quest in content/ validates", () => {
    for (const dir of findQuestDirs(contentRoot)) {
      expect(validateQuest(dir).errors, dir).toEqual([]);
    }
  });
});
