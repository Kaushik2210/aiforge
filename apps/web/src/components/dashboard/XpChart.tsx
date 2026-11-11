"use client";

import { localDateKey, xpSeries } from "@aiforge/engine";
import { areaPath, linePath, linearScale, niceMax, ticks, type Pt } from "@/lib/chart-geometry";
import { localZone } from "@/lib/mastery";
import { useProgress } from "@/lib/progress-store";

const W = 640;
const H = 220;
const M = { left: 46, right: 14, top: 14, bottom: 30 };
const DAYS = 30;

/** Total XP over the last 30 days. Days the XP history no longer reaches are left out, not guessed. */
export function XpChart() {
  const snapshot = useProgress((s) => s.snapshot);
  const status = useProgress((s) => s.status);
  // Dates and zones only exist in the browser, so render nothing time-based until the data has loaded
  // (the same on the server and on first paint, which keeps hydration consistent).
  if (status === "loading") {
    return (
      <section aria-labelledby="xp-h" className="rounded-[var(--radius)] border border-border bg-surface p-5">
        <h2 id="xp-h" className="text-xl">XP over 30 days</h2>
        <p className="mt-1 text-text-muted">Loading...</p>
      </section>
    );
  }
  const zone = localZone();
  const today = localDateKey(Date.now(), zone);
  const series = xpSeries(snapshot.ledger, snapshot.xpTotal, zone, today, DAYS);

  const known = series.points.filter((p) => p.cumulative !== null);
  const max = niceMax(Math.max(...known.map((p) => p.cumulative!), 0));
  const x = linearScale(0, DAYS - 1, M.left, W - M.right);
  const y = linearScale(0, max, H - M.bottom, M.top);
  const pts: (Pt | null)[] = series.points.map((p, i) => (p.cumulative === null ? null : { x: x(i), y: y(p.cumulative) }));
  const solid = pts.filter((p): p is Pt => p !== null);
  const gained = known.reduce((sum, p) => sum + p.xp, 0);

  return (
    <section aria-labelledby="xp-h" className="rounded-[var(--radius)] border border-border bg-surface p-5">
      <h2 id="xp-h" className="text-xl">XP over 30 days</h2>
      <p className="mt-1 text-text-muted">
        {`${snapshot.xpTotal} XP in total, ${gained} earned in this window.`}
      </p>

      <div className="mt-3 overflow-x-auto">
        <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full max-w-[640px]" role="img" aria-label={`Line chart of total XP over the last ${DAYS} days, now ${snapshot.xpTotal}. A table follows.`}>
          {ticks(max, 4).map((t) => (
            <g key={t}>
              <line x1={M.left} x2={W - M.right} y1={y(t)} y2={y(t)} stroke="var(--c-border)" strokeWidth={0.5} />
              <text x={M.left - 6} y={y(t) + 4} fontSize={11} textAnchor="end" fill="var(--c-text-muted)">{t}</text>
            </g>
          ))}
          {solid.length > 1 && <path d={areaPath(solid, H - M.bottom)} fill="color-mix(in srgb, var(--c-accent) 25%, transparent)" />}
          <path d={linePath(pts)} fill="none" stroke="var(--c-accent)" strokeWidth={3} strokeLinejoin="round" strokeLinecap="round" />
          {solid.length > 0 && <circle cx={solid.at(-1)!.x} cy={solid.at(-1)!.y} r={5} fill="var(--c-primary)" stroke="var(--c-bg)" strokeWidth={2} />}
          {[0, Math.floor((DAYS - 1) / 2), DAYS - 1].map((i) => (
            <text key={i} x={x(i)} y={H - 8} fontSize={11} textAnchor={i === 0 ? "start" : i === DAYS - 1 ? "end" : "middle"} fill="var(--c-text-muted)">
              {series.points[i]!.day.slice(5)}
            </text>
          ))}
        </svg>
      </div>

      {!series.complete && (
        <p className="mt-2 text-sm text-text-muted">
          Days before {series.knownFrom ?? "now"} are not shown: AIForge keeps your most recent 300 XP awards, so older
          days can no longer be broken down.
        </p>
      )}

      <details className="mt-3">
        <summary className="tap flex cursor-pointer items-center text-sm font-semibold">Last 14 days as a table</summary>
        <table className="mt-2 w-full max-w-md text-left text-sm">
          <caption className="sr-only">XP earned and total, last 14 days</caption>
          <thead>
            <tr><th scope="col" className="py-1 pr-4">Day</th><th scope="col" className="py-1 pr-4">Earned</th><th scope="col" className="py-1">Total</th></tr>
          </thead>
          <tbody>
            {series.points.slice(-14).reverse().map((p) => (
              <tr key={p.day} className="border-t border-border">
                <th scope="row" className="py-1 pr-4 font-normal">{p.day}</th>
                <td className="py-1 pr-4 font-mono">{p.cumulative === null ? "-" : p.xp}</td>
                <td className="py-1 font-mono">{p.cumulative ?? "-"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </section>
  );
}
