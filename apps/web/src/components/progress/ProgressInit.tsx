"use client";

import { useEffect, useState } from "react";
import { useProgress } from "@/lib/progress-store";

/** Loads saved progress once, shows storage notices and the XP reward toast. */
export function ProgressInit() {
  const init = useProgress((s) => s.init);
  const notice = useProgress((s) => s.notice);
  const dismiss = useProgress((s) => s.dismissNotice);
  const reward = useProgress((s) => s.reward);
  const [visible, setVisible] = useState<typeof reward>(null);

  useEffect(() => {
    void init();
  }, [init]);

  useEffect(() => {
    if (!reward) return;
    setVisible(reward);
    const t = setTimeout(() => setVisible(null), 4500);
    return () => clearTimeout(t);
  }, [reward]);

  return (
    <>
      {notice && (
        <div role="alert" className="border-b border-border bg-surface-2">
          <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-2 text-sm">
            <p>{notice}</p>
            <button
              type="button"
              onClick={dismiss}
              className="tap rounded-[var(--radius)] border border-border bg-surface px-3 font-semibold"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      <div aria-live="polite" className="pointer-events-none fixed bottom-4 right-4 z-50 max-w-xs">
        {visible && (
          <div key={visible.key} className="reveal rounded-[var(--radius)] border-2 border-primary bg-surface p-3 shadow-lg">
            {visible.xpGained > 0 && <p className="font-display text-lg text-primary">+{visible.xpGained} XP</p>}
            {visible.levelUp && <p className="font-semibold">Level up! You reached level {visible.levelUp.to}.</p>}
            {visible.rankUp && <p className="font-semibold">New rank: {visible.rankUp.to}</p>}
          </div>
        )}
      </div>
    </>
  );
}
