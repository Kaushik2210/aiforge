"use client";

import dynamic from "next/dynamic";
import { useEffect, useId, useState } from "react";

// Monaco is heavy: load it only when an editor is actually shown.
const Monaco = dynamic(() => import("@monaco-editor/react"), {
  ssr: false,
  loading: () => <p className="p-4 text-text-muted">Loading editor...</p>,
});

interface Props {
  value: string;
  onChange: (v: string) => void;
  label: string;
}

/**
 * Monaco on roomy screens; a plain, fully accessible textarea on small or
 * touch screens, or whenever the learner prefers it.
 */
export function CodeEditor({ value, onChange, label }: Props) {
  const id = useId();
  const [simple, setSimple] = useState(true); // textarea first: no flash, works without JS extras
  const [dark, setDark] = useState(false);

  useEffect(() => {
    const roomy = window.matchMedia("(min-width: 768px) and (pointer: fine)").matches;
    let stored: string | null = null;
    try { stored = localStorage.getItem("aiforge-simple-editor"); } catch { /* ignore */ }
    setSimple(stored === "1" ? true : !roomy);
    const attr = document.documentElement.dataset.theme;
    setDark(attr ? attr === "dark" : window.matchMedia("(prefers-color-scheme: dark)").matches);
  }, []);

  function toggle(next: boolean) {
    setSimple(next);
    try { localStorage.setItem("aiforge-simple-editor", next ? "1" : "0"); } catch { /* ignore */ }
  }

  return (
    <div>
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <label htmlFor={id} className="font-semibold">{label}</label>
        <label className="tap flex items-center gap-2 text-sm">
          <input type="checkbox" checked={simple} onChange={(e) => toggle(e.target.checked)} className="h-4 w-4" />
          Simple editor (best for screen readers and phones)
        </label>
      </div>

      {simple ? (
        <textarea
          id={id}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          spellCheck={false}
          autoCapitalize="off"
          autoCorrect="off"
          rows={Math.min(24, Math.max(10, value.split("\n").length + 2))}
          className="w-full rounded-[var(--radius)] border-2 border-border bg-surface-2 p-3 font-mono text-sm text-text"
        />
      ) : (
        <div className="overflow-hidden rounded-[var(--radius)] border-2 border-border">
          <Monaco
            height="360px"
            language="python"
            beforeMount={(m) => {
              // Built-in comment greens fall just under WCAG AA on the editor background.
              m.editor.defineTheme("aiforge-dark", { base: "vs-dark", inherit: true, rules: [{ token: "comment", foreground: "8fbf7a" }], colors: {} });
              m.editor.defineTheme("aiforge-light", { base: "vs", inherit: true, rules: [{ token: "comment", foreground: "2f6b1f" }], colors: {} });
            }}
            theme={dark ? "aiforge-dark" : "aiforge-light"}
            value={value}
            onChange={(v) => onChange(v ?? "")}
            options={{ minimap: { enabled: false }, fontSize: 14, scrollBeyondLastLine: false, ariaLabel: label, tabSize: 4 }}
          />
          <p className="bg-surface p-2 text-xs text-text-muted">
            Keyboard tip: press Ctrl+M (Cmd+M on Mac) to let Tab move focus out of the editor.
          </p>
        </div>
      )}
    </div>
  );
}
