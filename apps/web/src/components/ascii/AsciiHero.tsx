"use client";

import { useEffect, useRef, useState } from "react";
import { rainFrame, skylineFrame } from "@/lib/ascii-fx";
import { useMotionAllowed } from "@/lib/use-motion-allowed";

const COLS = 72;
const ROWS = 18;
const FRAME_MS = 100;

/** A text picture drawn as one block. Decorative: hidden from assistive technology. */
function frameAt(t: number): string {
  const sky = skylineFrame(COLS, ROWS, t);
  const rain = rainFrame(COLS, ROWS, t);
  // code rain falls through the upper sky only, so the ridges stay readable
  return sky.map((row, y) => (y < ROWS * 0.45 ? [...row].map((ch, x) => (ch === " " && rain[y]![x] !== " " ? rain[y]![x]! : ch)).join("") : row)).join("\n");
}

/**
 * The home page's ASCII skyline with falling code. It moves only when motion is
 * allowed, and then has a visible Pause button (WCAG 2.2.2). Otherwise it is one still frame.
 */
export function AsciiHero() {
  const allowed = useMotionAllowed();
  const [paused, setPaused] = useState(false);
  const preRef = useRef<HTMLPreElement>(null);
  const running = allowed && !paused;

  useEffect(() => {
    const pre = preRef.current;
    if (!pre) return;
    if (!running) {
      pre.textContent = frameAt(2);
      return;
    }
    let raf = 0;
    let last = 0;
    const start = performance.now();
    const tick = (now: number) => {
      if (now - last >= FRAME_MS) {
        last = now;
        pre.textContent = frameAt((now - start) / 1000 + 2);
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [running]);

  return (
    <div className="relative">
      <pre ref={preRef} aria-hidden="true" className="ascii-hero select-none overflow-hidden whitespace-pre font-mono text-accent" />
      {allowed && (
        <button
          type="button"
          aria-pressed={paused}
          onClick={() => setPaused((p) => !p)}
          className="tap absolute right-2 top-2 rounded border border-border bg-surface px-3 font-mono text-sm text-text"
        >
          {paused ? "Play animation" : "Pause animation"}
        </button>
      )}
    </div>
  );
}
