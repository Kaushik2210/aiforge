import type { Metadata } from "next";
import path from "node:path";
import { layoutSkillTree } from "@aiforge/engine";
import { readSkillTree } from "@aiforge/content-schema";
import { SkillTreeView, type SkillTopicView } from "@/components/skills/SkillTreeView";
import { listQuests } from "@/lib/quests";

export const metadata: Metadata = { title: "Skill tree" };

export default function SkillsPage() {
  const tree = readSkillTree(path.resolve(process.cwd(), "../../content"));
  const available = new Set(listQuests().map((q) => q.id));
  const topics: SkillTopicView[] = tree.topics.map((t) => ({ ...t, available: available.has(t.id) }));
  const layout = layoutSkillTree(topics);

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <h1 className="text-3xl md:text-4xl">Skill tree</h1>
      <p className="mt-2 max-w-prose text-text-muted">
        How the topics build on each other. An arrow runs from a topic to the ones it helps with. This is a
        recommended order, not a lock: open anything you like. Topics with a solid border are built; dashed ones are
        planned.
      </p>
      <div className="mt-6">
        <SkillTreeView layout={layout} topics={topics} />
      </div>
    </div>
  );
}
