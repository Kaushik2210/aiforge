"use client";

import { useEffect, useState } from "react";
import { typedPrefix } from "@/lib/ascii-fx";
import { useMotionAllowed } from "@/lib/use-motion-allowed";

/**
 * A terminal command that types itself once: "$ forge start gradient-descent".
 * The whole line is always in the page for screen readers and when motion is off.
 */
export function BootLine({ command, className = "" }: { command: string; className?: string }) {
  const allowed = useMotionAllowed();
  const [typed, setTyped] = useState<string | null>(null);

  useEffect(() => {
    if (!allowed) {
      setTyped(null);
      return;
    }
    let raf = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const p = (now - start) / (command.length * 45);
      setTyped(p >= 1 ? null : typedPrefix(command, p));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [allowed, command]);

  return (
    <p className={`font-mono text-sm text-accent ${className}`}>
      <span aria-hidden="true">$ </span>
      <span className={typed === null ? undefined : "sr-only"}>{command}</span>
      {typed !== null && <span aria-hidden="true">{typed}</span>}
    </p>
  );
}
