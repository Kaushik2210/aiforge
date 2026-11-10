"use client";

import { sectionMastery } from "@aiforge/engine";
import { axisAngle, radarPoint, radarPolygon } from "@/lib/chart-geometry";
import { localZone, scoreTopics } from "@/lib/mastery";
import { useProgress } from "@/lib/progress-store";
import { REALMS } from "@/lib/realms";

export interface RadarTopic {
  id: string;
  title: string;
  realm: number;
  available: boolean;
}

const W = 440;
const H = 330;
const CX = W / 2;
const CY = H / 2;
const R = 108;

/** The first word of a realm's name: enough to label an axis (the table has the full names). */
const shortName = (realm: number) => (REALMS[realm - 1]?.name ?? `Realm ${realm}`).split(" ")[0]!;

/** Mastery by realm, plus the topics most worth a visit next. */
export function MasteryRadar({ topics }: { topics: RadarTopic[] }) {
  const snapshot = useProgress((s) => s.snapshot);
  const status = useProgress((s) => s.status);
  const scores = scoreTopics(snapshot, topics, localZone());

  const realms = [...new Set(topics.map((t) => t.realm))].sort((a, b) => a - b);
  const values = realms.map((r) => sectionMastery(topics.filter((t) => t.realm === r).map((t) => scores.get(t.id)!.percent)));

  const built = topics
    .filter((t) => t.available)
    .map((t) => ({ ...t, ...scores.get(t.id)! }))
    .sort((a, b) => a.percent - b.percent);

  return (
    <section aria-labelledby="radar-h" className="rounded-[var(--radius)] border border-border bg-surface p-5">
      <h2 id="radar-h" className="text-xl">Mastery by realm</h2>
      <p className="mt-1 text-text-muted">
        Realms with no built quest yet read 0%, so this fills in as the academy grows.
      </p>

      <div className="mt-3 flex flex-wrap items-start gap-6">
        <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full max-w-[440px]" role="img" aria-label="Radar chart of mastery by realm. A table with the same numbers follows.">
          {[25, 50, 75, 100].map((ring) => (
            <polygon key={ring} points={radarPolygon(realms.map(() => ring), CX, CY, R)} fill="none" stroke="var(--c-border)" strokeWidth={ring === 100 ? 1.5 : 0.6} />
          ))}
          {realms.map((_, i) => {
            const end = radarPoint(100, i, realms.length, CX, CY, R);
            return <line key={i} x1={CX} y1={CY} x2={end.x} y2={end.y} stroke="var(--c-border)" strokeWidth={0.6} />;
          })}
          <polygon points={radarPolygon(values, CX, CY, R)} fill="color-mix(in srgb, var(--c-accent) 30%, transparent)" stroke="var(--c-accent)" strokeWidth={2.5} strokeLinejoin="round" />
          {values.map((v, i) => {
            const p = radarPoint(v, i, realms.length, CX, CY, R);
            return <circle key={i} cx={p.x} cy={p.y} r={3.5} fill="var(--c-primary)" />;
          })}
          {realms.map((r, i) => {
            const a = axisAngle(i, realms.length);
            const lx = CX + Math.cos(a) * (R + 14);
            const ly = CY + Math.sin(a) * (R + 14);
            const anchor = Math.abs(Math.cos(a)) < 0.2 ? "middle" : Math.cos(a) > 0 ? "start" : "end";
            return (
              <text key={r} x={lx} y={ly + 4} fontSize={11} textAnchor={anchor} fill="var(--c-text)">
                R{r} {shortName(r)}
              </text>
            );
          })}
        </svg>

        <table className="min-w-[14rem] flex-1 text-left text-sm">
          <caption className="sr-only">Mastery percentage by realm</caption>
          <thead>
            <tr><th scope="col" className="py-1 pr-4">Realm</th><th scope="col" className="py-1">Mastery</th></tr>
          </thead>
          <tbody>
            {realms.map((r, i) => (
              <tr key={r} className="border-t border-border">
                <th scope="row" className="py-1 pr-4 font-normal">{r}. {REALMS[r - 1]?.name}</th>
                <td className="py-1 font-mono">{status === "loading" ? "..." : `${values[i]}%`}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {built.length > 0 && (
        <div className="mt-5">
          <h3 className="text-lg">Worth a visit next</h3>
          <ul className="mt-2 space-y-1">
            {built.map((t) => (
              <li key={t.id}>
                <a href={`/quests/${t.id}/`} className="font-semibold text-accent underline">{t.title}</a>{" "}
                <span className="text-text-muted">{t.percent}% {t.label}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
