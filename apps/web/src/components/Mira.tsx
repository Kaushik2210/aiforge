type Mood = "happy" | "thinking" | "cheer";

/**
 * Mira, the lantern-bearer: an original AIForge guide character.
 * Flat cel-style shapes, theme-aware via CSS variables.
 */
export function Mira({ mood = "happy", size = 160 }: { mood?: Mood; size?: number }) {
  const mouth =
    mood === "thinking" ? "M78 108 q8 -2 16 0" : mood === "cheer" ? "M74 104 q12 18 24 0 z" : "M74 106 q12 12 24 0";
  return (
    <svg
      role="img"
      aria-label="Mira, a cheerful guide holding a glowing lantern"
      width={size}
      height={size}
      viewBox="0 0 172 172"
      className="float"
    >
      {/* lantern glow */}
      <circle cx="140" cy="112" r="22" fill="var(--c-xp)" opacity="0.35" />
      <circle cx="140" cy="112" r="11" fill="var(--c-xp)" />
      <rect x="134" y="94" width="12" height="5" rx="2" fill="var(--c-text-muted)" />
      <path d="M118 128 q10 -10 22 -17" stroke="var(--c-text)" strokeWidth="4" fill="none" strokeLinecap="round" />
      {/* hair back */}
      <path d="M40 80 q-4 -52 46 -54 q50 2 46 54 q-2 38 -14 58 h-64 q-12 -20 -14 -58z" fill="var(--c-primary)" />
      {/* body */}
      <path d="M52 172 q4 -32 34 -32 q30 0 34 32z" fill="var(--c-accent)" />
      {/* face */}
      <ellipse cx="86" cy="92" rx="34" ry="36" fill="#ffe3cf" />
      {/* fringe */}
      <path d="M52 84 q4 -34 34 -34 q30 0 34 34 q-14 -16 -34 -16 q-20 0 -34 16z" fill="var(--c-primary)" />
      {/* eyes */}
      <ellipse cx="72" cy="94" rx="6" ry="8" fill="#1a1f36" />
      <ellipse cx="100" cy="94" rx="6" ry="8" fill="#1a1f36" />
      <circle cx="74" cy="91" r="2.4" fill="#fff" />
      <circle cx="102" cy="91" r="2.4" fill="#fff" />
      {/* cheeks */}
      <ellipse cx="62" cy="106" rx="5" ry="3" fill="#ff9aa8" opacity="0.7" />
      <ellipse cx="110" cy="106" rx="5" ry="3" fill="#ff9aa8" opacity="0.7" />
      <path d={mouth} stroke="#1a1f36" strokeWidth="2.5" fill={mood === "cheer" ? "#c21f47" : "none"} strokeLinecap="round" />
    </svg>
  );
}
