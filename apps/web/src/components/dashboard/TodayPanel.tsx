"use client";

import {
  evaluateDailyQuest,
  generateDailyQuest,
  isDue,
  localDateKey,
  streakStatus,
  XP,
  type Catalog,
} from "@aiforge/engine";
import Link from "next/link";
import { localZone } from "@/lib/mastery";
import { useProgress } from "@/lib/progress-store";

const STREAK_LINE = {
  none: "No streak yet. Do one small thing today to start one.",
  "counted-today": "Today is counted.",
  "at-risk": "Do something today to keep it going.",
  frozen: "A streak freeze has you covered for the days you missed.",
  broken: "A new streak starts with your next activity. Your longest streak is safe.",
} as const;

/** Today's Daily Quest, the streak, the cards waiting and a way back into the learning. */
export function TodayPanel({ catalog }: { catalog: Catalog }) {
  const snapshot = useProgress((s) => s.snapshot);
  const status = useProgress((s) => s.status);
  const dispatch = useProgress((s) => s.dispatch);

  if (status === "loading") {
    return <div aria-hidden="true" className="h-56 rounded-[var(--radius)] border border-border bg-surface" />;
  }

  const zone = localZone();
  const now = Date.now();
  const today = localDateKey(now, zone);
  const quest = generateDailyQuest(catalog, snapshot, today, zone);
  const st = evaluateDailyQuest(snapshot, today, zone);
  const streak = streakStatus(snapshot.streak, now, zone);
  const due = Object.values(snapshot.cards).filter((c) => isDue(c, today)).length;
  const done = [st.step, st.review.done, st.build];
  const doneCount = done.filter(Boolean).length;

  // Where to pick up: the first tier not yet done.
  const next = catalog.quests
    .flatMap((q) => q.tierIds.map((t) => ({ q, t })))
    .find(({ q, t }) => !(`${q.id}:${t}` in snapshot.steps));

  return (
    <section aria-labelledby="today-h" className="rounded-[var(--radius)] border-2 border-primary bg-surface p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 id="today-h" className="text-2xl">Today&apos;s quest</h2>
        <p className="text-sm font-semibold">{doneCount} of 3 done</p>
      </div>

      <ol className="mt-3 space-y-3">
        {quest.goals.map((g, i) => (
          <li key={g.kind} className="flex gap-3">
            <span
              aria-hidden="true"
              className={`mt-0.5 grid h-7 w-7 flex-none place-items-center rounded-full border-2 text-sm font-bold ${
                done[i] ? "border-success bg-success text-bg" : "border-border text-text-muted"
              }`}
            >
              {done[i] ? "✓" : i + 1}
            </span>
            <div className="min-w-0">
              <p className="font-semibold">
                <Link href={g.href} className="text-text underline decoration-border underline-offset-4 hover:text-accent">
                  {g.title}
                </Link>{" "}
                <span className={done[i] ? "text-success" : "text-text-muted"}>({done[i] ? "done" : "to do"})</span>
              </p>
              <p className="text-sm text-text-muted">
                {g.kind === "review" && st.review.cards > 0 && !st.review.done
                  ? `${st.review.cards} of 5 cards so far. `
                  : ""}
                {g.detail}
              </p>
            </div>
          </li>
        ))}
      </ol>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        {st.claimed ? (
          <p className="font-semibold text-success">Bonus claimed. Well played.</p>
        ) : st.complete ? (
          <button type="button" onClick={() => void dispatch({ type: "daily-quest-claim" })} className="tap rounded-[var(--radius)] bg-primary px-5 font-bold text-on-primary">
            Claim +{XP.dailyQuest} XP
          </button>
        ) : (
          <p className="text-sm text-text-muted">Finish all three for a +{XP.dailyQuest} XP bonus. Skipping costs nothing.</p>
        )}
      </div>

      <dl className="mt-5 grid gap-3 border-t border-border pt-4 text-sm sm:grid-cols-3">
        <div>
          <dt className="font-semibold">Streak</dt>
          <dd className="text-text-muted">
            {streak.kind === "none" || streak.kind === "broken" ? "0 days" : `${streak.current} day${streak.current === 1 ? "" : "s"}`}
            {" "}(longest {streak.longest}). {STREAK_LINE[streak.kind]}
          </dd>
        </div>
        <div>
          <dt className="font-semibold">Flashcards</dt>
          <dd className="text-text-muted">
            <Link href="/review/" className="font-semibold text-accent underline">
              {due > 0 ? `${due} due` : "None due"}
            </Link>
            {Object.keys(snapshot.cards).length === 0 && ". Finish a tier to add your first deck."}
          </dd>
        </div>
        <div>
          <dt className="font-semibold">Continue</dt>
          <dd className="text-text-muted">
            {next ? (
              <Link href={`/quests/${next.q.id}/`} className="font-semibold text-accent underline">
                {next.q.title}, tier {next.t}
              </Link>
            ) : (
              "Every tier is done. Try the map for what is next."
            )}
          </dd>
        </div>
      </dl>
    </section>
  );
}
