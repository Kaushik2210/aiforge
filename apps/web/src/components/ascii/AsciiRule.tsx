import { asciiRule } from "@/lib/ascii-fx";

/** A decorative text divider. It is hidden from assistive technology and clipped, never wrapped. */
export function AsciiRule({ label, className = "" }: { label?: string; className?: string }) {
  return (
    <div aria-hidden="true" className={`ascii-only ascii-rule overflow-hidden whitespace-pre font-mono text-text-muted ${className}`}>
      {asciiRule(96, label)}
    </div>
  );
}
