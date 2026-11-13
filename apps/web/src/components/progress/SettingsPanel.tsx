"use client";

import { levelProgress, rankForLevel, streakStatus } from "@aiforge/engine";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { DEFAULT_FX_LEVEL, FX_CHOICES, applyFxLevel, readFxLevel, type FxLevel } from "@/lib/effects";
import { useProgress } from "@/lib/progress-store";

const btn =
  "tap rounded-[var(--radius)] border-2 border-border bg-surface px-4 font-semibold text-text disabled:opacity-60";

export function SettingsPanel() {
  const status = useProgress((s) => s.status);
  const snapshot = useProgress((s) => s.snapshot);
  const exportText = useProgress((s) => s.exportText);
  const importText = useProgress((s) => s.importText);
  const reset = useProgress((s) => s.reset);
  const [message, setMessage] = useState<{ kind: "ok" | "error"; text: string } | null>(null);
  const [mode, setMode] = useState<"merge" | "replace">("merge");
  const fileRef = useRef<HTMLInputElement>(null);
  const [fx, setFx] = useState<FxLevel>(DEFAULT_FX_LEVEL);
  // Read the saved choice after the first paint so the server and browser render the same thing.
  useEffect(() => setFx(readFxLevel()), []);

  const p = levelProgress(snapshot.xpTotal);
  const st = streakStatus(snapshot.streak, Date.now(), Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC");

  async function doExport() {
    const text = await exportText();
    const url = URL.createObjectURL(new Blob([text], { type: "application/json" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `aiforge-progress-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setMessage({ kind: "ok", text: "Progress exported. Keep the file somewhere safe." });
  }

  async function doImport(file: File | undefined) {
    if (!file) return;
    if (file.size > 20_000_000) {
      setMessage({ kind: "error", text: "That file is too large to be an AIForge export." });
      return;
    }
    const res = await importText(await file.text(), mode);
    setMessage(
      res.ok
        ? { kind: "ok", text: mode === "merge" ? "Imported and merged with your progress." : "Imported. Your previous progress was backed up first." }
        : { kind: "error", text: `Could not import: ${res.errors[0] ?? "unknown problem"}. Nothing was changed.` },
    );
    if (fileRef.current) fileRef.current.value = "";
  }

  async function doReset() {
    if (!window.confirm("Erase all your progress on this device? A backup copy is kept, but you should export first.")) return;
    await reset();
    setMessage({ kind: "ok", text: "Progress reset." });
  }

  return (
    <div className="space-y-8">
      <section aria-labelledby="summary-h" className="rounded-[var(--radius)] border border-border bg-surface p-4">
        <h2 id="summary-h" className="text-xl">Your progress</h2>
        {status === "loading" ? (
          <p className="text-text-muted">Loading...</p>
        ) : (
          <dl className="mt-2 grid gap-x-6 gap-y-1 sm:grid-cols-2">
            <dt className="text-text-muted">Level and rank</dt>
            <dd>Level {p.level}, {rankForLevel(p.level).name}</dd>
            <dt className="text-text-muted">Total XP</dt>
            <dd>{snapshot.xpTotal}</dd>
            <dt className="text-text-muted">Current streak</dt>
            <dd>{st.current} days ({st.freezes} freeze{st.freezes === 1 ? "" : "s"} held)</dd>
            <dt className="text-text-muted">Longest streak</dt>
            <dd>{st.longest} days</dd>
            <dt className="text-text-muted">Tiers completed</dt>
            <dd>{Object.keys(snapshot.steps).length}</dd>
            <dt className="text-text-muted">Challenges passed</dt>
            <dd>{Object.values(snapshot.challenges).filter((c) => c.passed).length}</dd>
          </dl>
        )}
      </section>

      <section aria-labelledby="fx-h" className="rounded-[var(--radius)] border border-border bg-surface p-4">
        <h2 id="fx-h" className="text-xl">Effects</h2>
        <p className="mt-1 text-text-muted">
          How dramatic the game effects are: screen shake, freezes on impact, speed lines, level-up banners. Your
          system's reduced-motion setting and Focus mode always turn them off, whatever you pick here.
        </p>
        <p className="mt-2">
          <Link href="/fx-lab/" className="font-semibold underline">Preview the effects in the lab</Link>
        </p>
        <fieldset className="mt-3">
          <legend className="sr-only">Effects level</legend>
          <div className="flex flex-wrap gap-3">
            {FX_CHOICES.map((c) => (
              <label key={c.level} className="tap flex cursor-pointer items-center gap-2 rounded-[var(--radius)] border-2 border-border bg-surface px-3">
                <input
                  type="radio"
                  name="fx"
                  checked={fx === c.level}
                  onChange={() => {
                    setFx(c.level);
                    applyFxLevel(c.level);
                  }}
                />
                <span>
                  <span className="font-semibold">{c.name}</span>
                  <span className="block text-sm text-text-muted">{c.blurb}</span>
                </span>
              </label>
            ))}
          </div>
        </fieldset>
      </section>

      <section aria-labelledby="backup-h" className="rounded-[var(--radius)] border border-border bg-surface p-4">
        <h2 id="backup-h" className="text-xl">Back up or move your progress</h2>
        <p className="mt-1 text-text-muted">
          Everything stays in this browser. Export a file to keep a backup or to continue on another device.
        </p>
        <div className="mt-3 flex flex-wrap gap-3">
          <button type="button" className={btn} onClick={() => void doExport()} disabled={status === "loading"}>
            Export progress
          </button>
        </div>

        <fieldset className="mt-5">
          <legend className="font-semibold">Import a progress file</legend>
          <div className="mt-2 flex flex-wrap gap-4">
            <label className="tap flex items-center gap-2">
              <input type="radio" name="mode" checked={mode === "merge"} onChange={() => setMode("merge")} />
              Merge with what I have (keeps the best of both)
            </label>
            <label className="tap flex items-center gap-2">
              <input type="radio" name="mode" checked={mode === "replace"} onChange={() => setMode("replace")} />
              Replace what I have
            </label>
          </div>
          <label className="mt-3 block">
            <span className="sr-only">Choose a progress file</span>
            <input
              ref={fileRef}
              type="file"
              accept="application/json,.json"
              disabled={status === "loading" || status === "memory-only" || status === "read-only"}
              onChange={(e) => void doImport(e.target.files?.[0])}
              className="tap block w-full max-w-md rounded-[var(--radius)] border-2 border-border bg-surface-2 p-2"
            />
          </label>
        </fieldset>

        <div role="status" aria-live="polite" className="mt-3">
          {message && (
            <p className={`font-semibold ${message.kind === "ok" ? "text-success" : "text-danger"}`}>{message.text}</p>
          )}
        </div>
      </section>

      <section aria-labelledby="danger-h" className="rounded-[var(--radius)] border-2 border-danger bg-surface p-4">
        <h2 id="danger-h" className="text-xl">Start over</h2>
        <p className="mt-1 text-text-muted">Erases progress on this device. A backup copy is kept for recovery.</p>
        <button type="button" className={`${btn} mt-3 border-danger text-danger`} onClick={() => void doReset()} disabled={status === "loading"}>
          Reset progress
        </button>
      </section>
    </div>
  );
}
