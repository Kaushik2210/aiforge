import type { Metadata } from "next";
import { readSkillTree } from "@aiforge/content-schema";
import { Heatmap } from "@/components/dashboard/Heatmap";
import { MasteryRadar } from "@/components/dashboard/MasteryRadar";
import { TodayPanel } from "@/components/dashboard/TodayPanel";
import { XpChart } from "@/components/dashboard/XpChart";
import { CONTENT_ROOT, getCatalog } from "@/lib/catalog";

export const metadata: Metadata = { title: "Dashboard" };

export default function DashboardPage() {
  const { catalog } = getCatalog();
  const built = new Set(catalog.quests.map((q) => q.id));
  const topics = readSkillTree(CONTENT_ROOT).topics.map((t) => ({ id: t.id, title: t.title, realm: t.realm, available: built.has(t.id) }));

  return (
    <div className="mx-auto max-w-5xl space-y-6 px-4 py-8">
      <div>
        <h1 className="text-3xl md:text-4xl">Dashboard</h1>
        <p className="mt-2 max-w-prose text-text-muted">
          Your day, your streak and how your learning is going. It all lives in this browser; nothing is sent anywhere.
        </p>
      </div>
      <TodayPanel catalog={catalog} />
      <div className="grid gap-6 lg:grid-cols-2">
        <XpChart />
        <MasteryRadar topics={topics} />
      </div>
      <Heatmap />
    </div>
  );
}
