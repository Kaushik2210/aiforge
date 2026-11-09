"use client";

import type { RunResult } from "@aiforge/runner";
import { useEffect, useRef, useState } from "react";
import { getRunner } from "@/lib/runner";
import { CodeEditor } from "./CodeEditor";

export interface ChallengeData {
  id: string;
  title: string;
  summary: string;
  starter: string;
  tests: string;
  hiddenTests?: string;
  hints: string[];
}

type Phase = "idle" | "loading" | "running";

const draftKey = (id: string) => `aiforge-draft-${id}`;

export function Challenge({ challenge }: { challenge: ChallengeData }) {
  const [code, setCode] = useState(challenge.starter);
  const [phase, setPhase] = useState<Phase>("idle");
  const [result, setResult] = useState<RunResult | null>(null);
  const [hintsShown, setHintsShown] = useState(0);
  const [elapsedMs, setElapsedMs] = useState<number | null>(null);
  const mounted = useRef(false);

  // Restore an unsent draft (a per-learner convenience; page works without it).
  useEffect(() => {
    try {
      const saved = localStorage.getItem(draftKey(challenge.id));
      if (saved) setCode(saved);
    } catch { /* storage blocked */ }
    mounted.current = true;
  }, [challenge.id]);

  function update(v: string) {
    setCode(v);
    if (!mounted.current) return;
    try { localStorage.setItem(draftKey(challenge.id), v); } catch { /* ignore */ }
  }

  async function run() {
    setResult(null);
    setPhase("loading");
    try {
      const runner = getRunner();
      await runner.warmUp();
      setPhase("running");
      const t0 = performance.now();
      const r = await runner.run(code, challenge.tests, challenge.hiddenTests);
      setElapsedMs(Math.round(performance.now() - t0));
      setResult(r);
    } catch (err) {
      setResult({
        passed: false,
        tests: [],
        error: err instanceof Error ? err.message : String(err),
        output: "",
        outputTruncated: false,
      });
    } finally {
      setPhase("idle");
    }
  }

  function stop() {
    getRunner().cancel();
  }

  function reset() {
    update(challenge.starter);
    setResult(null);
  }

  const busy = phase !== "idle";

  return (
    <section aria-labelledby={`${challenge.id}-title`} className="my-8 rounded-[var(--radius)] border-2 border-border bg-surface p-4">
      <h3 id={`${challenge.id}-title`} className="text-xl">{challenge.title}</h3>
      <p className="mt-1 text-text-muted">{challenge.summary}</p>

      <div className="mt-4">
        <div
          onKeyDown={(e) => {
            if ((e.ctrlKey || e.metaKey) && e.key === "Enter" && phase === "idle") {
              e.preventDefault();
              void run();
            }
          }}
        >
          <CodeEditor value={code} onChange={update} label="Your Python code" />
        </div>
        <p className="mt-1 text-xs text-text-muted">Tip: press Ctrl+Enter (Cmd+Enter on Mac) to run the tests.</p>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={run}
          disabled={busy}
          className="tap rounded-[var(--radius)] bg-primary px-5 font-bold text-on-primary disabled:opacity-60"
        >
          {phase === "loading" ? "Loading Python..." : phase === "running" ? "Running..." : "Run tests"}
        </button>
        {phase === "running" && (
          <button
            type="button"
            onClick={stop}
            className="tap rounded-[var(--radius)] border-2 border-danger bg-surface px-4 font-bold text-danger"
          >
            Stop
          </button>
        )}
        <button
          type="button"
          onClick={reset}
          disabled={busy}
          className="tap rounded-[var(--radius)] border-2 border-border bg-surface px-4 font-semibold text-text"
        >
          Reset to starter
        </button>
        {hintsShown < challenge.hints.length && (
          <button
            type="button"
            onClick={() => setHintsShown((n) => n + 1)}
            className="tap rounded-[var(--radius)] border-2 border-border bg-surface px-4 font-semibold text-text"
          >
            Show hint {hintsShown + 1} of {challenge.hints.length}
          </button>
        )}
      </div>
      {phase === "loading" && (
        <p className="mt-2 text-sm text-text-muted">
          First run downloads the Python runtime (about 13 MB). After that it works offline and starts instantly.
        </p>
      )}

      {hintsShown > 0 && (
        <ol className="mt-3 list-decimal space-y-1 pl-6">
          {challenge.hints.slice(0, hintsShown).map((h, i) => <li key={i}>{h}</li>)}
        </ol>
      )}

      <div role="status" aria-live="polite" className="mt-4">
        {result && <Results result={result} elapsedMs={elapsedMs} />}
      </div>
    </section>
  );
}

function Results({ result, elapsedMs }: { result: RunResult; elapsedMs: number | null }) {
  const total = result.tests.length;
  const ok = result.tests.filter((t) => t.passed).length;
  return (
    <div className="rounded-lg bg-surface-2 p-3">
      {result.error ? (
        <>
          <p className="font-bold text-danger">{result.cancelled ? "Run stopped" : result.timedOut ? "Stopped: took too long" : "Your code hit an error"}</p>
          {!result.cancelled && <pre className="mt-1 whitespace-pre-wrap text-sm">{result.error}</pre>}
        </>
      ) : (
        <p className={`font-bold ${result.passed ? "text-success" : "text-danger"}`}>
          {result.passed ? `All ${total} tests passed. Nice work!` : `${ok} of ${total} tests passed`}
        </p>
      )}
      {result.hidden && (
        <p className="mt-2 text-sm">
          <strong className={result.hidden.passed === result.hidden.total ? "text-success" : "text-danger"}>
            Hidden checks: {result.hidden.passed} of {result.hidden.total} passed.
          </strong>{" "}
          <span className="text-text-muted">
            They try different inputs so an answer that only fits the examples above does not pass.
          </span>
        </p>
      )}
      {total > 0 && (
        <ul className="mt-2 space-y-1">
          {result.tests.map((t) => (
            <li key={t.name} className="text-sm">
              <strong className={t.passed ? "text-success" : "text-danger"}>{t.passed ? "Passed" : "Failed"}</strong>
              {": "}
              {t.name}
              {t.message && <span className="block pl-4 text-text-muted">{t.message}</span>}
            </li>
          ))}
        </ul>
      )}
      {result.output && (
        <details className="mt-3">
          <summary className="tap flex cursor-pointer items-center text-sm font-semibold">Your program's output</summary>
          <pre className="mt-1 max-h-60 overflow-auto whitespace-pre-wrap text-sm">{result.output}</pre>
          {result.outputTruncated && <p className="text-xs text-text-muted">Output was cut off to keep the page fast.</p>}
        </details>
      )}
      {elapsedMs !== null && !result.timedOut && !result.cancelled && (
        <p className="mt-2 text-xs text-text-muted">Ran in {elapsedMs} ms.</p>
      )}
    </div>
  );
}
