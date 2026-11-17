"use client";

import { levelProgress } from "@aiforge/engine";
import { PageBanner } from "@/components/scene/PageBanner";
import { useProgress } from "@/lib/progress-store";

/** The dashboard strip: the ball sits at how far you are through your current level. */
export function DashboardBanner() {
  const status = useProgress((s) => s.status);
  const xpTotal = useProgress((s) => s.snapshot.xpTotal);
  const p = levelProgress(xpTotal);
  const label = p.maxed ? `Level ${p.level}, top level` : `Level ${p.level}: ${p.xpIntoLevel} of ${p.xpForNext} XP to the next`;
  return <PageBanner loading={status === "loading"} progress={p.maxed ? 1 : p.fraction} label={status === "loading" ? "Loading your progress" : label} />;
}

/** The quest strip: the ball sits at how many of this quest's tiers you have finished. */
export function QuestBanner({ questId, tierIds }: { questId: string; tierIds: string[] }) {
  const status = useProgress((s) => s.status);
  const steps = useProgress((s) => s.snapshot.steps);
  const done = tierIds.filter((t) => `${questId}:${t}` in steps).length;
  const total = Math.max(1, tierIds.length);
  return (
    <PageBanner
      loading={status === "loading"}
      progress={done / total}
      label={status === "loading" ? "Loading your progress" : `${done} of ${tierIds.length} tiers done`}
    />
  );
}
