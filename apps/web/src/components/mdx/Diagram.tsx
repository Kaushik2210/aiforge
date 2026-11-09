import type { ReactNode } from "react";

/** Wrapper for diagrams: an accessible figure with a visible caption. */
export function Diagram({ caption, children }: { caption: string; children: ReactNode }) {
  return (
    <figure className="my-6 rounded-[var(--radius)] border border-border bg-surface p-4">
      <div className="overflow-x-auto">{children}</div>
      <figcaption className="mt-2 text-sm text-text-muted">{caption}</figcaption>
    </figure>
  );
}
