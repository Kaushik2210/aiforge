import type { ReactNode } from "react";

const STYLES = {
  note: { label: "Note", border: "border-accent", text: "text-accent" },
  warn: { label: "Watch out", border: "border-danger", text: "text-danger" },
  tip: { label: "Tip", border: "border-success", text: "text-success" },
} as const;

/** The label is always text, so meaning never depends on colour alone. */
export function Callout({ type = "note", title, children }: { type?: keyof typeof STYLES; title?: string; children: ReactNode }) {
  const s = STYLES[type];
  return (
    <aside className={`my-5 rounded-[var(--radius)] border-l-4 ${s.border} bg-surface p-4`}>
      <p className={`text-sm font-bold uppercase tracking-wide ${s.text}`}>{title ?? s.label}</p>
      <div className="mt-1 space-y-2">{children}</div>
    </aside>
  );
}
