"use client";

import { buildHeatmap, dailyXp, localDateKey } from "@aiforge/engine";
import { useProgress } from "@/lib/progress-store";
import { localZone } from "@/lib/mastery";

const CELL = 14;
const GAP = 3;
const LEFT = 30;
const TOP = 20;
const WEEKS = 26;

/** One intensity scale in a single hue, so it works without telling colours apart. */
const FILL = [
  "var(--c-surface-2)",
  "color-mix(in srgb, var(--c-accent) 35%, var(--c-surface-2))",
  "color-mix(in srgb, var(--c-accent) 55%, var(--c-surface-2))",
  "color-mix(in srgb, var(--c-accent) 80%, var(--c-surface-2))",
  "var(--c-accent)",
] as const;

/** A GitHub-style calendar of the last 26 weeks of practice. */
export function Heatmap() {
  const snapshot = useProgress((s) => s.snapshot);
  const status = useProgress((s) => s.status);
  // Dates and zones only exist in the browser, so render nothing time-based until the data has loaded
  // (the same on the server and on first paint, which keeps hydration consistent).
  if (status === "loading") {
    return (
      <section aria-labelledby="heat-h" className="rounded-[var(--radius)] border border-border bg-surface p-5">
        <h2 id="heat-h" className="text-xl">Practice calendar</h2>
        <p className="mt-1 text-text-muted">Loading...</p>
      </section>
    );
  }
  const zone = localZone();
  const today = localDateKey(Date.now(), zone);
  const map = buildHeatmap(snapshot.streak.activeDays, dailyXp(snapshot.ledger, zone), today, WEEKS);
  const width = LEFT + WEEKS * (CELL + GAP);
  const height = TOP + 7 * (CELL + GAP);
  const recent = map.weeks.flat().filter((c) => !c.future).slice(-14).reverse();

  return (
    <section aria-labelledby="heat-h" className="rounded-[var(--radius)] border border-border bg-surface p-5">
      <h2 id="heat-h" className="text-xl">Practice calendar</h2>
      <p className="mt-1 text-text-muted">
        {`${map.activeDays} active day${map.activeDays === 1 ? "" : "s"} in the last ${WEEKS} weeks. Darker means more XP that day.`}
      </p>

      <div className="mt-3 overflow-x-auto">
        <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} role="img" aria-label={`Practice calendar for the last ${WEEKS} weeks. ${map.activeDays} active days. A table of recent days follows.`}>
          {map.months.map((m) => (
            <text key={`${m.label}-${m.week}`} x={LEFT + m.week * (CELL + GAP)} y={12} fontSize={11} fill="var(--c-text-muted)">
              {m.label}
            </text>
          ))}
          {["Mon", "Wed", "Fri"].map((d, i) => (
            <text key={d} x={0} y={TOP + (i * 2) * (CELL + GAP) + CELL - 2} fontSize={11} fill="var(--c-text-muted)">
              {d}
            </text>
          ))}
          {map.weeks.map((col, w) =>
            col.map((cell, d) => (
              <rect
                key={cell.day}
                x={LEFT + w * (CELL + GAP)}
                y={TOP + d * (CELL + GAP)}
                width={CELL}
                height={CELL}
                rx={3}
                fill={cell.future ? "transparent" : FILL[cell.level]}
                stroke={cell.day === today ? "var(--c-text)" : cell.future ? "transparent" : "var(--c-border)"}
                strokeWidth={cell.day === today ? 2 : 0.5}
              >
                <title>{cell.future ? cell.day : `${cell.day}: ${cell.active ? `${cell.xp} XP` : "no activity"}`}</title>
              </rect>
            )),
          )}
        </svg>
      </div>

      <div className="mt-2 flex items-center gap-2 text-xs text-text-muted" aria-hidden="true">
        Less
        {FILL.map((f, i) => (
          <span key={i} className="inline-block h-3 w-3 rounded-sm border border-border" style={{ background: f }} />
        ))}
        More
      </div>

      <details className="mt-3">
        <summary className="tap flex cursor-pointer items-center text-sm font-semibold">Recent days as a table</summary>
        <table className="mt-2 w-full max-w-md text-left text-sm">
          <caption className="sr-only">Practice in the last 14 days</caption>
          <thead>
            <tr><th scope="col" className="py-1 pr-4">Day</th><th scope="col" className="py-1 pr-4">Practised</th><th scope="col" className="py-1">XP</th></tr>
          </thead>
          <tbody>
            {recent.map((c) => (
              <tr key={c.day} className="border-t border-border">
                <th scope="row" className="py-1 pr-4 font-normal">{c.day}</th>
                <td className="py-1 pr-4">{c.active ? "Yes" : "No"}</td>
                <td className="py-1 font-mono">{c.xp}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </section>
  );
}
