"use client";

import { NODE_H, NODE_W, localDateKey, sectionMastery, topicMastery, type TreeLayout } from "@aiforge/engine";
import Link from "next/link";
import { useState } from "react";
import { useProgress } from "@/lib/progress-store";
import { wrapTitle } from "@/lib/wrap";
import { withBase } from "@/lib/base-path";

export interface SkillTopicView {
  id: string;
  title: string;
  realm: number;
  prerequisites: string[];
  /** True when a quest with this id exists. */
  available: boolean;
}

/**
 * The skill tree as an SVG diagram plus an equivalent text list. Prerequisites
 * are a recommended order, never a lock. Mastery is shown as a bar and as text,
 * so colour is never the only signal.
 */
export function SkillTreeView({ layout, topics }: { layout: TreeLayout; topics: SkillTopicView[] }) {
  const snapshot = useProgress((s) => s.snapshot);
  const status = useProgress((s) => s.status);
  const [active, setActive] = useState<string | null>(null);

  const today = localDateKey(Date.now(), Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC");
  const byId = new Map(topics.map((t) => [t.id, t]));
  const mastery = new Map(
    topics.map((t) => {
      if (!t.available) return [t.id, { percent: 0, label: "Planned" as string }] as const;
      const boss = snapshot.bosses[`${t.id}-boss`];
      const m = topicMastery(
        {
          quiz: snapshot.quiz[t.id] ?? { attempts: 0, correct: 0 },
          cards: Object.values(snapshot.cards).filter((c) => c.topicId === t.id),
          bossBest: boss ? boss.best : null,
        },
        today,
      );
      return [t.id, { percent: m.percent, label: m.label as string }] as const;
    }),
  );

  const related = new Set<string>();
  if (active) {
    related.add(active);
    for (const p of byId.get(active)?.prerequisites ?? []) related.add(p);
    for (const t of topics) if (t.prerequisites.includes(active)) related.add(t.id);
  }

  const realms = [...new Set(topics.map((t) => t.realm))].sort((a, b) => a - b);

  return (
    <div className="space-y-8">
      <ul aria-label="Mastery by realm" className="flex flex-wrap gap-2">
        {realms.map((r) => {
          const ts = topics.filter((t) => t.realm === r);
          const pct = sectionMastery(ts.map((t) => mastery.get(t.id)!.percent));
          return (
            <li key={r} className="rounded-full border border-border bg-surface px-3 py-1 text-sm">
              Realm {r}: <strong>{status === "loading" ? "..." : `${pct}%`}</strong>
            </li>
          );
        })}
      </ul>

      <div className="overflow-auto rounded-[var(--radius)] border-2 border-border bg-surface-2 p-2">
        <svg
          width={layout.width}
          height={layout.height}
          viewBox={`0 0 ${layout.width} ${layout.height}`}
          role="group"
          aria-label="Skill tree diagram. Arrows run from a topic to the topics it helps with. The same information is listed as text below."
          className="block"
        >
          <g fill="none">
            {layout.edges.map((e) => {
              const hot = active !== null && (e.from === active || e.to === active);
              return (
                <path
                  key={`${e.from}-${e.to}`}
                  d={e.d}
                  stroke={hot ? "var(--c-primary)" : "var(--c-border)"}
                  strokeWidth={hot ? 3.5 : 2}
                  opacity={active && !hot ? 0.35 : 1}
                />
              );
            })}
          </g>

          {layout.nodes.map((n) => {
            const topic = byId.get(n.id)!;
            const m = mastery.get(n.id)!;
            const dim = active !== null && !related.has(n.id);
            const lines = wrapTitle(topic.title, 22, 2);
            const body = (
              <g
                transform={`translate(${n.x} ${n.y})`}
                opacity={dim ? 0.4 : 1}
                onPointerEnter={() => setActive(n.id)}
                onPointerLeave={() => setActive(null)}
              >
                <rect
                  width={NODE_W}
                  height={NODE_H}
                  rx={12}
                  fill="var(--c-surface)"
                  stroke={topic.available ? "var(--c-primary)" : "var(--c-border)"}
                  strokeWidth={topic.available ? 3 : 2}
                  strokeDasharray={topic.available ? undefined : "6 5"}
                />
                <text x={12} y={18} fontSize={11} fontWeight={700} fill="var(--c-text-muted)">
                  REALM {n.realm}{" "}
                </text>
                {lines.map((line, i) => (
                  <text key={i} x={12} y={36 + i * 15} fontSize={14} fontWeight={700} fill="var(--c-text)">
                    {line}{" "}
                  </text>
                ))}
                {topic.available ? (
                  <>
                    <rect x={12} y={NODE_H - 10} width={NODE_W - 24} height={5} rx={2.5} fill="var(--c-surface-2)" />
                    <rect x={12} y={NODE_H - 10} width={((NODE_W - 24) * m.percent) / 100} height={5} rx={2.5} fill="var(--c-accent)" />
                    <text x={NODE_W - 12} y={18} fontSize={11} fontWeight={700} textAnchor="end" fill="var(--c-primary)">
                      {m.percent}%{" "}
                    </text>
                  </>
                ) : (
                  <text x={NODE_W - 12} y={18} fontSize={11} textAnchor="end" fill="var(--c-text-muted)">
                    planned
                  </text>
                )}
              </g>
            );
            return topic.available ? (
              <a
                key={n.id}
                href={withBase(`/quests/${n.id}/`)}
                aria-label={`Realm ${n.realm} ${topic.title} ${m.percent}% ${m.label}. Open the quest.`}
                onFocus={() => setActive(n.id)}
                onBlur={() => setActive(null)}
              >
                {body}
              </a>
            ) : (
              <g key={n.id} aria-hidden="true">
                {body}
              </g>
            );
          })}
        </svg>
      </div>

      <section aria-labelledby="skill-list">
        <h2 id="skill-list" className="text-2xl">Every topic, as a list</h2>
        <ul className="mt-4 space-y-3">
          {topics
            .slice()
            .sort((a, b) => a.realm - b.realm || a.title.localeCompare(b.title))
            .map((t) => {
              const m = mastery.get(t.id)!;
              const needs = t.prerequisites.map((p) => byId.get(p)?.title ?? p);
              return (
                <li key={t.id} className="rounded-[var(--radius)] border border-border bg-surface p-3">
                  <p className="font-semibold">
                    {t.available ? (
                      <Link href={`/quests/${t.id}/`} className="text-accent underline">{t.title}</Link>
                    ) : (
                      t.title
                    )}{" "}
                    <span className="font-normal text-text-muted">
                      Realm {t.realm} &middot; {t.available ? `${m.percent}% ${m.label}` : "Planned, not built yet"}
                    </span>
                  </p>
                  <p className="text-sm text-text-muted">
                    {needs.length ? `Easier after: ${needs.join(", ")}.` : "A good place to start: no prerequisites."}
                  </p>
                </li>
              );
            })}
        </ul>
      </section>
    </div>
  );
}
