import { asciiBar } from "@/lib/ascii";

interface Props {
  /** The accessible name, for example "XP to next level". */
  label: string;
  value: number;
  max: number;
  width?: number;
  className?: string;
}

/**
 * A progress bar drawn with text, "[####------]". It is a real progress bar for
 * assistive technology (role, name, min, max, now); the characters are decoration
 * and hidden from screen readers, and the percentage sits beside them in text.
 */
export function AsciiProgress({ label, value, max, width = 10, className = "" }: Props) {
  const safeMax = Number.isFinite(max) && max > 0 ? max : 1;
  const safeNow = Number.isFinite(value) ? Math.min(safeMax, Math.max(0, value)) : 0;
  const percent = Math.round((safeNow / safeMax) * 100);
  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={safeMax}
      aria-valuenow={safeNow}
      className={`font-mono leading-tight ${className}`}
    >
      <span aria-hidden="true" className="whitespace-pre text-text">
        {asciiBar(safeNow, safeMax, width)}
      </span>
      <span aria-hidden="true" className="ml-1 text-text-muted">
        {percent}%
      </span>
    </div>
  );
}
