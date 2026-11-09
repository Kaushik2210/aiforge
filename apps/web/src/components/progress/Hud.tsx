"use client";

import { levelProgress, rankForLevel, streakStatus } from "@aiforge/engine";
import { useProgress } from "@/lib/progress-store";

const zone = () => Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";

const STREAK_TEXT = {
  none: "No streak yet",
  "counted-today": "streak",
  "at-risk": "streak, practise today to keep it",
  frozen: "streak, a freeze has you covered",
  broken: "Start a new streak today",
} as const;

/** Compact level, rank, XP and streak readout for the header. */
export function Hud() {
  const status = useProgress((s) => s.status);
  const snapshot = useProgress((s) => s.snapshot);

  if (status === "loading") {
    return <div aria-hidden="true" className="h-11 w-48 rounded-[var(--radius)] bg-surface-2" />;
  }

  const p = levelProgress(snapshot.xpTotal);
  const rank = rankForLevel(p.level);
  const st = streakStatus(snapshot.streak, Date.now(), zone());
  const streakLabel =
    st.kind === "none" || st.kind === "broken" ? STREAK_TEXT[st.kind] : `${st.current}-day ${STREAK_TEXT[st.kind]}`;

  return (
    <div className="flex items-center gap-3 text-sm" aria-label="Your progress">
      <div className="min-w-0">
        <p className="font-semibold leading-tight">
          Level {p.level} <span className="font-normal text-text-muted">&middot; {rank.name}</span>
        </p>
        <div
          role="progressbar"
          aria-label="XP to next level"
          aria-valuemin={0}
          aria-valuemax={p.maxed ? 1 : p.xpForNext}
          aria-valuenow={p.maxed ? 1 : p.xpIntoLevel}
          className="mt-1 h-2 w-36 overflow-hidden rounded-full bg-surface-2"
        >
          <div className="h-full rounded-full bg-xp" style={{ width: `${Math.round(p.fraction * 100)}%` }} />
        </div>
      </div>
      <p className="hidden max-w-[12rem] leading-tight sm:block">
        <span aria-hidden="true" className="mr-1 inline-block h-3 w-3 rounded-full bg-primary align-middle" />
        {streakLabel}
      </p>
    </div>
  );
}
