import { assignLayers, type TreeTopic } from "@aiforge/engine";
import { renderSkillText, type SkillLike } from "@/lib/ascii-fx";

/**
 * The skill tree as layered text (a star marks a topic that is built). Decorative: the graph and the
 * list above it hold the same information and stay the accessible versions.
 */
export function AsciiSkillTree({ topics }: { topics: readonly (SkillLike & TreeTopic)[] }) {
  const rows = renderSkillText(topics, assignLayers(topics));
  return (
    <figure className="ascii-only mt-8 overflow-hidden rounded-[var(--radius)] border border-border bg-surface p-4">
      <figcaption className="font-mono text-sm text-text-muted">$ forge skills --ascii &nbsp;(* = built, &lt;= comes after)</figcaption>
      <pre aria-hidden="true" className="ascii-skills mt-3 select-none overflow-hidden whitespace-pre font-mono text-accent">
        {rows.join("\n")}
      </pre>
    </figure>
  );
}
