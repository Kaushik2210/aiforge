import { renderRealmMap } from "@/lib/ascii-fx";
import { MAP_REALMS } from "@/lib/map-data";

/**
 * The quest map drawn as a text path (a star marks an open realm). Decorative: the list and
 * the graphical map hold the same information and stay the accessible versions.
 */
export function AsciiRealmMap() {
  return (
    <figure className="mt-8 overflow-hidden rounded-[var(--radius)] border border-border bg-surface p-4">
      <figcaption className="font-mono text-sm text-text-muted">$ forge map --ascii &nbsp;(* = open now)</figcaption>
      <pre aria-hidden="true" className="ascii-map mt-3 select-none overflow-hidden whitespace-pre font-mono text-accent">
        {renderRealmMap(MAP_REALMS).join("\n")}
      </pre>
    </figure>
  );
}
