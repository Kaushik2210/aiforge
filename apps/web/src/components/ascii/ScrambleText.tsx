"use client";

import { useEffect, useState } from "react";
import { scrambleFrame } from "@/lib/ascii-fx";
import { useMotionAllowed } from "@/lib/use-motion-allowed";

interface Props {
  text: string;
  /** Milliseconds the scramble takes. */
  duration?: number;
}

/**
 * Text that resolves out of noise once when it appears. The real words are always in
 * the page for screen readers and for anyone with motion off; the noise is decoration.
 */
export function ScrambleText({ text, duration = 900 }: Props) {
  const allowed = useMotionAllowed();
  const [shown, setShown] = useState<string | null>(null);

  useEffect(() => {
    if (!allowed) {
      setShown(null);
      return;
    }
    let raf = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const p = (now - start) / duration;
      setShown(p >= 1 ? null : scrambleFrame(text, p, 5));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [allowed, text, duration]);

  return (
    <>
      <span className={shown === null ? undefined : "sr-only"}>{text}</span>
      {shown !== null && <span aria-hidden="true">{shown}</span>}
    </>
  );
}
