"use client";

import { localDateKey, topicMastery } from "@aiforge/engine";
import { useProgress } from "@/lib/progress-store";

const pct = (n: number) => `${Math.round(n * 100)}%`;

/** Topic mastery from quiz accuracy, flashcard retention and the best boss score. */
export function MasteryPanel({ questId, bossId }: { questId: string; bossId: string }) {
  const snapshot = useProgress((s) => s.snapshot);
  const status = useProgress((s) => s.status);

  const cards = Object.values(snapshot.cards).filter((c) => c.topicId === questId);
  const quiz = snapshot.quiz[questId] ?? { attempts: 0, correct: 0 };
  const boss = snapshot.bosses[bossId];
  const today = localDateKey(Date.now(), Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC");
  const m = topicMastery({ quiz, cards, bossBest: boss ? boss.best : null }, today);

  return (
    <section aria-labelledby="mastery-h" className="rounded-[var(--radius)] border border-border bg-surface p-4">
      <h2 id="mastery-h" className="text-lg">Mastery</h2>
      {status === "loading" ? (
        <p className="text-sm text-text-muted">Loading...</p>
      ) : (
        <>
          <p className="mt-1">
            <span className="font-display text-2xl">{m.percent}%</span>{" "}
            <span className="font-semibold text-accent">{m.label}</span>
          </p>
          <div
            role="progressbar"
            aria-label="Topic mastery"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={m.percent}
            className="mt-2 h-3 overflow-hidden rounded-full bg-surface-2"
          >
            <div className="h-full rounded-full bg-accent" style={{ width: `${m.percent}%` }} />
          </div>
          <ul className="mt-3 space-y-1 text-sm text-text-muted">
            <li>Quiz accuracy: {pct(m.quiz)} ({quiz.correct} of {quiz.attempts} answers)</li>
            <li>Flashcard retention: {pct(m.retention)} (the Review Tavern arrives on Day 10)</li>
            <li>Boss: {boss ? `best ${pct(boss.best)}` : "not attempted (bosses arrive later)"}</li>
          </ul>
        </>
      )}
    </section>
  );
}
