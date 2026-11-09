import path from "node:path";
import { LessonFrontmatterSchema, findQuestDirs, readLesson, type LessonFrontmatter } from "@aiforge/content-schema";

const CONTENT_ROOT = path.resolve(process.cwd(), "../../content");

export interface QuestSummary extends LessonFrontmatter {
  dir: string;
}

/** Load every quest's validated frontmatter at build time. */
export function listQuests(): QuestSummary[] {
  return findQuestDirs(CONTENT_ROOT).map((dir) => {
    const fm = LessonFrontmatterSchema.parse(readLesson(dir).data);
    return { ...fm, dir };
  });
}

export function getQuest(id: string): QuestSummary | undefined {
  return listQuests().find((q) => q.id === id);
}

export const TIER_LABELS: Record<string, { name: string; blurb: string }> = {
  L1: { name: "Intuition", blurb: "A mental model you can poke at" },
  L2: { name: "Mechanics", blurb: "The maths, worked by hand" },
  L3: { name: "Build it", blurb: "Implement it from scratch" },
  L4: { name: "Production reality", blurb: "What breaks at 3 a.m." },
  L5: { name: "Frontier", blurb: "Papers and open problems" },
};
