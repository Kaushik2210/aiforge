"use client";

import { useId, useState } from "react";
import { VERDICT_TEXT, factor, iterates, verdict } from "@/lib/gd";

const W = 420;
const H = 220;
const X_RANGE = 12; // x axis spans -12..12
const Y_MAX = 150; // f(x) = x^2 up to 150 fits the plot

const px = (x: number) => ((x + X_RANGE) / (2 * X_RANGE)) * W;
const py = (y: number) => H - 16 - (Math.min(y, Y_MAX) / Y_MAX) * (H - 32);

export function GradientDemo() {
  const id = useId();
  const [lr, setLr] = useState(0.2);
  const steps = 10;
  const xs = iterates(10, lr, steps);
  const v = verdict(lr);

  const curve = Array.from({ length: 49 }, (_, i) => {
    const x = -X_RANGE + (i * 2 * X_RANGE) / 48;
    return `${i === 0 ? "M" : "L"}${px(x).toFixed(1)},${py(x * x).toFixed(1)}`;
  }).join(" ");

  const inView = xs.filter((x) => Math.abs(x) <= X_RANGE);
  const trail = inView.map((x, i) => `${i === 0 ? "M" : "L"}${px(x).toFixed(1)},${py(x * x).toFixed(1)}`).join(" ");

  return (
    <figure className="my-6 rounded-[var(--radius)] border border-border bg-surface p-4">
      <figcaption className="font-display text-lg">Try the learning rate</figcaption>
      <p className="mt-1 text-sm text-text-muted">
        Minimising f(x) = x&sup2; from x = 10 for {steps} steps.
      </p>

      <div className="mt-3 flex flex-wrap items-center gap-3">
        <label htmlFor={id} className="font-semibold">
          Learning rate: <span className="font-mono">{lr.toFixed(2)}</span>
        </label>
        <input
          id={id}
          type="range"
          min={0.01}
          max={1.3}
          step={0.01}
          value={lr}
          onChange={(e) => setLr(Number(e.target.value))}
          className="min-h-11 w-full max-w-xs accent-[var(--c-primary)]"
          aria-describedby={`${id}-verdict`}
        />
      </div>

      <svg
        viewBox={`0 0 ${W} ${H}`}
        role="img"
        aria-label={`Parabola with the descent path for learning rate ${lr.toFixed(2)}; the final x is ${xs.at(-1)?.toFixed(2)}`}
        className="mt-3 w-full max-w-lg rounded-lg bg-surface-2"
      >
        <path d={curve} fill="none" stroke="var(--c-text-muted)" strokeWidth="2" />
        <line x1={px(0)} x2={px(0)} y1="8" y2={H - 8} stroke="var(--c-border)" strokeDasharray="4 4" />
        <path d={trail} fill="none" stroke="var(--c-primary)" strokeWidth="2" />
        {inView.map((x, i) => (
          <circle key={i} cx={px(x)} cy={py(x * x)} r={i === 0 ? 6 : 4} fill={i === 0 ? "var(--c-xp)" : "var(--c-primary)"} stroke="var(--c-bg)" />
        ))}
      </svg>

      <p id={`${id}-verdict`} role="status" aria-live="polite" className="mt-3 font-semibold">
        {VERDICT_TEXT[v]}
      </p>
      <p className="text-sm text-text-muted">
        Each step multiplies x by {factor(lr).toFixed(2)} (that is 1 - 2 &middot; lr). After {steps} steps x is{" "}
        <span className="font-mono">{xs.at(-1)?.toFixed(3)}</span>.
      </p>

      <details className="mt-3">
        <summary className="tap flex cursor-pointer items-center font-semibold">Show the numbers</summary>
        <ol className="mt-2 grid grid-cols-2 gap-x-6 font-mono text-sm sm:grid-cols-3">
          {xs.map((x, i) => (
            <li key={i}>
              step {i}: {x.toFixed(3)}
            </li>
          ))}
        </ol>
      </details>
    </figure>
  );
}
