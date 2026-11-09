import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";
import YAML from "yaml";
import type { ZodType } from "zod";
import {
  BossSchema,
  CardsSchema,
  InterviewSchema,
  LessonFrontmatterSchema,
  MistakesSchema,
  QuizSchema,
  SourcesSchema,
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

export function validateQuest(dir: string): QuestResult {
  const errors: string[] = [];
  const lessonFile = path.join(dir, "lesson.mdx");
  const fm = matter(fs.readFileSync(lessonFile, "utf8")).data;
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
  if (boss) {
    for (const c of boss.challenges) {
      if (!fs.existsSync(path.join(dir, "challenges", c))) {
        errors.push(`boss.yml: challenge folder "challenges/${c}" not found`);
      }
    }
  }
  return { dir, errors };
}
