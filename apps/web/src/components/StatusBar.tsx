/** XP + streak summary. Static placeholder values until the engine lands (Days 6-7). */
export function StatusBar({ level, xp, xpToNext, streak }: { level: number; xp: number; xpToNext: number; streak: number }) {
  const pct = Math.min(100, Math.round((xp / xpToNext) * 100));
  return (
    <section aria-label="Your progress" className="rounded-[var(--radius)] border border-border bg-surface p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="font-display text-lg">
          Level {level} <span className="text-text-muted text-sm font-body">Initiate</span>
        </p>
        <p className="flex items-center gap-2 text-sm font-semibold">
          <span aria-hidden="true" className="inline-block h-3 w-3 rounded-full bg-primary" />
          {streak}-day streak
        </p>
      </div>
      <div
        role="progressbar"
        aria-label="Experience to next level"
        aria-valuemin={0}
        aria-valuemax={xpToNext}
        aria-valuenow={xp}
        className="mt-3 h-4 overflow-hidden rounded-full bg-surface-2"
      >
        <div className="xp-fill h-full rounded-full bg-xp" style={{ width: `${pct}%` }} />
      </div>
      <p className="mt-2 text-sm text-text-muted">{xp} / {xpToNext} XP</p>
    </section>
  );
}
