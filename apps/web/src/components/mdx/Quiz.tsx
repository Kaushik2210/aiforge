"use client";

import { useState } from "react";

export interface QuizQuestion {
  id: string;
  kind: "concept" | "predict-output" | "spot-bug";
  question: string;
  code?: string;
  options: string[];
  answer: number;
  explanation: string;
  whyWrong: Record<string, string>;
}

const KIND_LABEL: Record<QuizQuestion["kind"], string> = {
  concept: "Concept",
  "predict-output": "Predict the output",
  "spot-bug": "Spot the bug",
};

function Question({ q, index, onResult }: { q: QuizQuestion; index: number; onResult: (id: string, ok: boolean) => void }) {
  const [picked, setPicked] = useState<number | null>(null);
  const [checked, setChecked] = useState(false);
  const correct = picked === q.answer;

  function check() {
    if (picked === null) return;
    setChecked(true);
    onResult(q.id, picked === q.answer);
  }

  return (
    <fieldset className="rounded-[var(--radius)] border border-border bg-surface p-4">
      <legend className="px-1 text-sm font-semibold text-accent">
        {index + 1}. {KIND_LABEL[q.kind]}
      </legend>
      <p className="font-semibold">{q.question}</p>
      {q.code && (
        <pre className="mt-2 overflow-x-auto rounded-lg bg-surface-2 p-3 text-sm">
          <code>{q.code}</code>
        </pre>
      )}
      <div className="mt-3 space-y-2">
        {q.options.map((opt, i) => {
          const isAnswer = checked && i === q.answer;
          const isWrongPick = checked && picked === i && i !== q.answer;
          return (
            <label
              key={i}
              className={`tap flex cursor-pointer items-start gap-3 rounded-lg border p-3 ${
                isAnswer ? "border-success" : isWrongPick ? "border-danger" : "border-border"
              }`}
            >
              <input
                type="radio"
                name={q.id}
                checked={picked === i}
                disabled={checked}
                onChange={() => setPicked(i)}
                className="mt-1 h-4 w-4 accent-[var(--c-primary)]"
              />
              <span>
                {opt}
                {isAnswer && <strong className="ml-2 text-success">(correct)</strong>}
                {isWrongPick && <strong className="ml-2 text-danger">(not quite)</strong>}
              </span>
            </label>
          );
        })}
      </div>

      {!checked ? (
        <button
          type="button"
          onClick={check}
          disabled={picked === null}
          className="tap mt-3 rounded-[var(--radius)] bg-primary px-4 font-semibold text-on-primary disabled:opacity-50"
        >
          Check answer
        </button>
      ) : (
        <div role="status" className="mt-3 rounded-lg bg-surface-2 p-3 text-sm">
          <p className="font-semibold">{correct ? "Nice, that's right." : "Not this time. Here is why."}</p>
          <p className="mt-1">{q.explanation}</p>
          {!correct && picked !== null && q.whyWrong[String(picked)] && (
            <p className="mt-1 text-text-muted">Your answer: {q.whyWrong[String(picked)]}</p>
          )}
        </div>
      )}
    </fieldset>
  );
}

export function Quiz({ questions }: { questions: QuizQuestion[] }) {
  const [results, setResults] = useState<Record<string, boolean>>({});
  const answered = Object.keys(results).length;
  const right = Object.values(results).filter(Boolean).length;

  return (
    <section aria-labelledby="quiz-heading" className="space-y-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 id="quiz-heading" className="text-2xl">Quiz bank</h2>
        <p role="status" className="text-sm text-text-muted">
          {answered === 0 ? `${questions.length} questions` : `${right} of ${answered} correct so far`}
        </p>
      </div>
      {questions.map((q, i) => (
        <Question key={q.id} q={q} index={i} onResult={(id, ok) => setResults((r) => ({ ...r, [id]: ok }))} />
      ))}
    </section>
  );
}
