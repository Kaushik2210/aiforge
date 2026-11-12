"use client";

import { useEffect } from "react";

interface Props {
  /** Big words, for example "LEVEL UP". */
  title: string;
  /** Smaller line under it, for example "Level 4". */
  subtitle?: string;
  /** Called once when the banner has finished. */
  onDone: () => void;
  /** How long it stays, in milliseconds. */
  durationMs?: number;
}

/**
 * An anime-style cut-in: an angled band slides across the screen with a little
 * overshoot, holds, and slides out, with speed lines flickering on twos at the
 * sides. It is decoration only, so it is hidden from screen readers (the XP toast
 * makes the same announcement) and never takes pointer events.
 *
 * Reduced motion and Focus mode turn the animation off in globals.css; the
 * band then just appears and disappears, and the text stays readable.
 * Nothing in it flashes.
 */
export function CutIn({ title, subtitle, onDone, durationMs = 1800 }: Props) {
  useEffect(() => {
    const t = setTimeout(onDone, durationMs);
    return () => clearTimeout(t);
  }, [onDone, durationMs]);

  return (
    <div className="cutin" aria-hidden="true" style={{ ["--cutin-ms" as string]: `${durationMs}ms` }}>
      <div className="cutin-band">
        <div className="cutin-lines" />
        <div className="cutin-text">
          <p className="cutin-title font-display">{title}</p>
          {subtitle && <p className="cutin-sub">{subtitle}</p>}
        </div>
      </div>
    </div>
  );
}
