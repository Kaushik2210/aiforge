import type { ReactNode } from "react";

/** "Check yourself": the learner tries first, then reveals the answer. */
export function Step({ prompt, children }: { prompt: string; children: ReactNode }) {
  return (
    <details className="my-5 rounded-[var(--radius)] border border-border bg-surface p-4">
      <summary className="tap flex cursor-pointer items-center font-semibold">
        Check yourself: {prompt}
      </summary>
      <div className="mt-2">{children}</div>
    </details>
  );
}
