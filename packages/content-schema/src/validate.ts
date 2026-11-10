import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";
import YAML from "yaml";
import type { ZodType } from "zod";
import {
  BossSchema,
  ChallengeMetaSchema,
  CardsSchema,
  InterviewSchema,
  LessonFrontmatterSchema,
  MistakesSchema,
  QuizSchema,
  SkillTreeSchema,
  SourcesSchema,
  type SkillTree,
  type QuizItem,
} from "./schemas";

export interface QuestResult {
  dir: string;
  errors: string[];
}

function readYaml(file: string): unknown {
  return YAML.parse(fs.readFileSync(file, "utf8"));
}

function check(dir: string, name: string, schema: ZodType, errors: string[]): unknown {
  const file = path.join(dir, name);
  if (!fs.existsSync(file)) {
    errors.push(`${name}: file is missing`);
    return undefined;
  }
  const data = readYaml(file);
  const res = schema.safeParse(data);
  if (!res.success) {
    for (const issue of res.error.issues) {
      errors.push(`${name}: ${issue.path.join(".") || "(root)"}: ${issue.message}`);
    }
    return undefined;
  }
  return res.data;
}

/** A quest directory is any directory containing lesson.mdx. */
export function findQuestDirs(root: string): string[] {
  const out: string[] = [];
  const walk = (d: string) => {
    for (const entry of fs.readdirSync(d, { withFileTypes: true })) {
      const full = path.join(d, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (entry.name === "lesson.mdx") out.push(d);
    }
  };
  if (fs.existsSync(root)) walk(root);
  return out;
}

/** Read a quest's raw lesson frontmatter and markdown body. */
export function readLesson(dir: string): { data: Record<string, unknown>; body: string } {
  // Use the same YAML 1.2 parser as the .yml files so dates stay strings.
  const file = matter(fs.readFileSync(path.join(dir, "lesson.mdx"), "utf8"), {
    engines: { yaml: (s: string) => YAML.parse(s) as object },
  });
  return { data: file.data, body: file.content };
}

export interface Challenge {
  id: string;
  title: string;
  summary: string;
  starter: string;
  tests: string;
  hiddenTests?: string;
  hints: string[];
}

/** Numbered lines ("1. ...") of hints.md, in order. */
export function parseHints(md: string): string[] {
  return md
    .split(/\r?\n/)
    .map((l) => /^\d+\.\s+(.*\S)/.exec(l)?.[1])
    .filter((h): h is string => Boolean(h));
}

/** Load every challenge in a quest (solution.py is deliberately not included). */
export function readChallenges(dir: string): Challenge[] {
  const root = path.join(dir, "challenges");
  if (!fs.existsSync(root)) return [];
  return fs
    .readdirSync(root, { withFileTypes: true })
    .filter((e) => e.isDirectory())
    .map((e) => {
      const c = path.join(root, e.name);
      const meta = ChallengeMetaSchema.parse(readYaml(path.join(c, "challenge.yml")));
      const hiddenFile = path.join(c, "hidden_tests.py");
      return {
        id: e.name,
        ...meta,
        ...(fs.existsSync(hiddenFile) ? { hiddenTests: fs.readFileSync(hiddenFile, "utf8") } : {}),
        starter: fs.readFileSync(path.join(c, "starter.py"), "utf8"),
        tests: fs.readFileSync(path.join(c, "tests.py"), "utf8"),
        hints: parseHints(fs.readFileSync(path.join(c, "hints.md"), "utf8")),
      };
    });
}

/** Load and validate a quest's quiz bank. */
export function readQuiz(dir: string): QuizItem[] {
  return QuizSchema.parse(readYaml(path.join(dir, "quiz.yml")));
}

export function validateQuest(dir: string): QuestResult {
  const errors: string[] = [];
  const fm = readLesson(dir).data;
  const parsed = LessonFrontmatterSchema.safeParse(fm);
  if (!parsed.success) {
    for (const i of parsed.error.issues) {
      errors.push(`lesson.mdx: ${i.path.join(".") || "(root)"}: ${i.message}`);
    }
  }

  const quiz = check(dir, "quiz.yml", QuizSchema, errors) as { id: string }[] | undefined;
  check(dir, "cards.yml", CardsSchema, errors);
  check(dir, "interview.yml", InterviewSchema, errors);
  check(dir, "mistakes.yml", MistakesSchema, errors);
  check(dir, "sources.yml", SourcesSchema, errors);
  const boss = check(dir, "boss.yml", BossSchema, errors) as
    | { quizItems: string[]; challenges: string[] }
    | undefined;

  if (quiz) {
    const ids = quiz.map((q) => q.id);
    if (new Set(ids).size !== ids.length) errors.push("quiz.yml: duplicate quiz item ids");
    if (boss) {
      for (const id of boss.quizItems) {
        if (!ids.includes(id)) errors.push(`boss.yml: unknown quiz item "${id}"`);
      }
    }
  }
  const chRoot = path.join(dir, "challenges");
  if (fs.existsSync(chRoot)) {
    for (const e of fs.readdirSync(chRoot, { withFileTypes: true })) {
      if (!e.isDirectory()) continue;
      const base = path.join(chRoot, e.name);
      for (const f of ["starter.py", "solution.py", "tests.py", "hidden_tests.py", "hints.md", "challenge.yml"]) {
        if (!fs.existsSync(path.join(base, f))) errors.push(`challenges/${e.name}: ${f} is missing`);
      }
      const mutantDir = path.join(base, "mutants");
      const mutants = fs.existsSync(mutantDir) ? fs.readdirSync(mutantDir).filter((f) => f.endsWith(".py")) : [];
      if (mutants.length < 2) errors.push(`challenges/${e.name}: needs at least 2 wrong-answer mutants in mutants/`);
      const hints = fs.existsSync(path.join(base, "hints.md"))
        ? parseHints(fs.readFileSync(path.join(base, "hints.md"), "utf8"))
        : [];
      if (hints.length !== 3) errors.push(`challenges/${e.name}: hints.md needs exactly 3 numbered hints`);
      if (fs.existsSync(path.join(base, "challenge.yml"))) {
        const res = ChallengeMetaSchema.safeParse(readYaml(path.join(base, "challenge.yml")));
        if (!res.success) {
          for (const i of res.error.issues) errors.push(`challenges/${e.name}/challenge.yml: ${i.path.join(".")}: ${i.message}`);
        }
      }
    }
  }
  if (boss) {
    for (const c of boss.challenges) {
      if (!fs.existsSync(path.join(dir, "challenges", c))) {
        errors.push(`boss.yml: challenge folder "challenges/${c}" not found`);
      }
    }
  }
  return { dir, errors };
}

/** Load and validate content/_skilltree.yml. Throws a readable error if it is invalid. */
export function readSkillTree(contentRoot: string): SkillTree {
  const res = SkillTreeSchema.safeParse(readYaml(path.join(contentRoot, "_skilltree.yml")));
  if (!res.success) {
    throw new Error(res.error.issues.map((i) => `${i.path.join(".") || "(root)"}: ${i.message}`).join("; "));
  }
  return res.data;
}

/** Errors found when comparing the skill tree with the real quests (empty means consistent). */
export function checkSkillTreeAgainstQuests(
  tree: SkillTree,
  quests: readonly { id: string; realm: number; prerequisites: readonly string[] }[],
): string[] {
  const errors: string[] = [];
  const byId = new Map(tree.topics.map((t) => [t.id, t]));
  for (const q of quests) {
    const topic = byId.get(q.id);
    if (!topic) {
      errors.push(`quest "${q.id}" has no entry in _skilltree.yml`);
      continue;
    }
    if (topic.realm !== q.realm) errors.push(`quest "${q.id}" is realm ${q.realm} but the skill tree says realm ${topic.realm}`);
    for (const p of q.prerequisites) {
      if (!topic.prerequisites.includes(p)) errors.push(`quest "${q.id}" requires "${p}" but the skill tree does not list it`);
    }
  }
  return errors;
}

export interface FlashcardContent {
  id: string;
  front: string;
  back: string;
}

/** Load and validate a quest's flashcards (cards.yml). */
export function readCards(dir: string): FlashcardContent[] {
  return CardsSchema.parse(readYaml(path.join(dir, "cards.yml")));
}
