"use client";

import { useProgress } from "@/lib/progress-store";

interface Tier {
  id: string;
  name: string;
  blurb: string;
}

/** The depth ladder: mark each tier done as you finish it (a "step" for XP and streaks). */
export function TierChecklist({ questId, tiers, cardIds }: { questId: string; tiers: Tier[]; cardIds: string[] }) {
  const steps = useProgress((s) => s.snapshot.steps);
  const status = useProgress((s) => s.status);
  const dispatch = useProgress((s) => s.dispatch);
  const hasDeck = useProgress((s) => Object.values(s.snapshot.cards).some((c) => c.topicId === questId));
  const done = tiers.filter((t) => `${questId}:${t.id}` in steps).length;

  return (
    <nav aria-label="Depth ladder" className="h-fit rounded-[var(--radius)] border border-border bg-surface p-4">
      <h2 className="text-lg">Depth ladder</h2>
      <p className="text-sm text-text-muted">
        {status === "loading" ? "Loading progress..." : `${done} of ${tiers.length} tiers done`}
      </p>
      <ol className="mt-3 space-y-2">
        {tiers.map((t) => {
          const isDone = `${questId}:${t.id}` in steps;
          return (
            <li key={t.id} className="rounded-lg bg-surface-2 p-3">
              <span className="font-semibold">{t.id} &middot; {t.name}</span>
              <span className="block text-sm text-text-muted">{t.blurb}</span>
              {isDone ? (
                <span className="mt-1 inline-block text-sm font-bold text-success">Done</span>
              ) : (
                <button
                  type="button"
                  disabled={status === "loading" || status === "read-only"}
                  onClick={async () => {
                    await dispatch({ type: "step-complete", id: `${questId}:${t.id}` });
                    // Finishing a first tier puts this quest's flashcards in your Review Tavern deck.
                    if (!hasDeck && cardIds.length > 0) await dispatch({ type: "enroll-cards", topicId: questId, cardIds });
                  }}
                  className="tap mt-1 rounded-[var(--radius)] border-2 border-border bg-surface px-3 text-sm font-semibold disabled:opacity-60"
                >
                  Mark tier done
                </button>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
