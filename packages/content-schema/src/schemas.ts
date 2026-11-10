import { z } from "zod";

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "expected YYYY-MM-DD");
const slug = z.string().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, "expected kebab-case slug");

export const TIERS = ["L1", "L2", "L3", "L4", "L5"] as const;
export const TierSchema = z.enum(TIERS);

/** Frontmatter at the top of a quest's lesson.mdx. */
export const LessonFrontmatterSchema = z
  .object({
    id: slug,
    title: z.string().min(3),
    realm: z.number().int().min(1).max(23),
    zone: z.string().min(2),
    prerequisites: z.array(slug).default([]),
    estimatedMinutes: z.number().int().min(5).max(480),
    verifiedOn: isoDate,
    tiers: z.array(TierSchema).min(1),
    skipTiers: z
      .array(z.object({ tier: TierSchema, reason: z.string().min(10) }))
      .default([]),
    coreFundamentals: z.array(z.string().min(5)).min(3),
    coreComplexity: z.array(z.string().min(5)).min(3),
    explainItBack: z.object({
      prompt: z.string().min(10),
      rubric: z.array(z.string().min(5)).min(3),
    }),
    miniGame: z.string().min(2),
    bossId: z.string().min(2),
  })
  .superRefine((fm, ctx) => {
    const covered = new Set<string>([...fm.tiers, ...fm.skipTiers.map((s) => s.tier)]);
    for (const t of TIERS) {
      if (!covered.has(t)) {
        ctx.addIssue({
          code: "custom",
          message: `tier ${t} is neither present nor justified in skipTiers`,
          path: ["tiers"],
        });
      }
    }
  });

export const QuizItemSchema = z
  .object({
    id: slug,
    kind: z.enum(["concept", "predict-output", "spot-bug"]).default("concept"),
    question: z.string().min(10),
    code: z.string().optional(),
    options: z.array(z.string().min(1)).min(3).max(6),
    answer: z.number().int().min(0),
    explanation: z.string().min(20),
    /** Why each wrong option is wrong, keyed by option index. */
    whyWrong: z.record(z.string(), z.string().min(5)),
  })
  .superRefine((q, ctx) => {
    if (q.answer >= q.options.length) {
      ctx.addIssue({ code: "custom", message: "answer index out of range", path: ["answer"] });
    }
    for (let i = 0; i < q.options.length; i++) {
      if (i !== q.answer && !(String(i) in q.whyWrong)) {
        ctx.addIssue({
          code: "custom",
          message: `missing whyWrong for option ${i}`,
          path: ["whyWrong"],
        });
      }
    }
  });
export const QuizSchema = z.array(QuizItemSchema).min(12);

export const CardSchema = z.object({
  id: slug,
  front: z.string().min(3),
  back: z.string().min(3),
});
export const CardsSchema = z.array(CardSchema).min(15);

export const InterviewItemSchema = z.object({
  question: z.string().min(10),
  modelAnswer: z.string().min(40),
  followUps: z.array(z.string().min(5)).min(1),
});
export const InterviewSchema = z.array(InterviewItemSchema).min(8);

export const MistakeSchema = z.object({
  mistake: z.string().min(10),
  why: z.string().min(20),
  detect: z.string().min(20),
});
export const MistakesSchema = z.array(MistakeSchema).min(5);

export const SourceSchema = z.object({
  title: z.string().min(3),
  url: z.string().url(),
  type: z.enum(["paper", "docs", "course", "book", "blog", "repo", "video"]),
  primary: z.boolean(),
  verifiedOn: isoDate,
  readFor: z.string().min(10),
});
export const SourcesSchema = z
  .array(SourceSchema)
  .superRefine((sources, ctx) => {
    if (sources.filter((s) => s.primary).length < 4) {
      ctx.addIssue({ code: "custom", message: "need at least 4 primary sources" });
    }
  });

export const BossSchema = z.object({
  id: z.string().min(2),
  passMark: z.number().min(0.5).max(1).default(0.8),
  timeLimitSeconds: z.number().int().min(60),
  /** Quiz item ids and challenge ids that make up the gauntlet. */
  quizItems: z.array(slug).min(5),
  challenges: z.array(slug).min(1),
  interleaveFrom: z.array(slug).default([]),
});

export const ChallengeMetaSchema = z.object({
  title: z.string().min(5),
  summary: z.string().min(20),
});

export const SkillTopicSchema = z.object({
  id: slug,
  title: z.string().min(3),
  realm: z.number().int().min(1).max(23),
  prerequisites: z.array(slug).default([]),
});

/** Find one dependency cycle, if any, as a list of ids that starts and ends on the same topic. */
export function findCycle(topics: readonly { id: string; prerequisites: readonly string[] }[]): string[] | null {
  const byId = new Map(topics.map((t) => [t.id, t]));
  const state = new Map<string, 1 | 2>(); // 1 = on the current path, 2 = finished
  const path: string[] = [];
  const visit = (id: string): string[] | null => {
    if (state.get(id) === 2) return null;
    if (state.get(id) === 1) return [...path.slice(path.indexOf(id)), id];
    state.set(id, 1);
    path.push(id);
    for (const p of byId.get(id)?.prerequisites ?? []) {
      if (!byId.has(p)) continue; // unknown ids are reported separately
      const found = visit(p);
      if (found) return found;
    }
    path.pop();
    state.set(id, 2);
    return null;
  };
  for (const t of topics) {
    const found = visit(t.id);
    if (found) return found;
  }
  return null;
}

export const SkillTreeSchema = z
  .object({ topics: z.array(SkillTopicSchema).min(1) })
  .superRefine((tree, ctx) => {
    const ids = new Set<string>();
    const realmOf = new Map(tree.topics.map((t) => [t.id, t.realm]));
    tree.topics.forEach((t, i) => {
      if (ids.has(t.id)) ctx.addIssue({ code: "custom", message: `duplicate topic id "${t.id}"`, path: ["topics", i, "id"] });
      ids.add(t.id);
    });
    tree.topics.forEach((t, i) => {
      const seen = new Set<string>();
      for (const p of t.prerequisites) {
        if (p === t.id) ctx.addIssue({ code: "custom", message: `"${t.id}" lists itself as a prerequisite`, path: ["topics", i, "prerequisites"] });
        else if (!realmOf.has(p)) ctx.addIssue({ code: "custom", message: `"${t.id}" needs unknown topic "${p}"`, path: ["topics", i, "prerequisites"] });
        else if (realmOf.get(p)! > t.realm) {
          ctx.addIssue({ code: "custom", message: `"${t.id}" (realm ${t.realm}) needs "${p}" from a later realm (${realmOf.get(p)})`, path: ["topics", i, "prerequisites"] });
        }
        if (seen.has(p)) ctx.addIssue({ code: "custom", message: `"${t.id}" lists "${p}" twice`, path: ["topics", i, "prerequisites"] });
        seen.add(p);
      }
    });
    const cycle = findCycle(tree.topics);
    if (cycle) ctx.addIssue({ code: "custom", message: `prerequisite cycle: ${cycle.join(" -> ")}`, path: ["topics"] });
  });

export type SkillTopic = z.infer<typeof SkillTopicSchema>;
export type SkillTree = z.infer<typeof SkillTreeSchema>;

export type LessonFrontmatter = z.infer<typeof LessonFrontmatterSchema>;
export type QuizItem = z.infer<typeof QuizItemSchema>;
export type Boss = z.infer<typeof BossSchema>;
