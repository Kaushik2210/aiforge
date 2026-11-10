import { hexToNumber, type MapRealm, type MapTheme } from "@aiforge/games";
import { REALMS } from "./realms";

/** The realms as the map needs them. A realm is "open" when it has a playable quest. */
export const MAP_REALMS: MapRealm[] = REALMS.map((r) => ({
  n: r.n,
  name: r.name,
  blurb: r.blurb,
  open: Boolean(r.quest),
}));

/** Read the current theme's colours from the page's CSS tokens so the canvas matches light, dark and any future theme. */
export function readMapTheme(): MapTheme {
  const style = getComputedStyle(document.documentElement);
  // If a token is missing or in a format we cannot read, use a sensible default
  // rather than breaking the whole page over a colour.
  const colour = (token: string, fallback: number) => {
    try {
      return hexToNumber(style.getPropertyValue(token).trim());
    } catch {
      console.warn(`Could not read ${token}; using a default colour on the map.`);
      return fallback;
    }
  };
  return {
    bg: colour("--c-bg", 0x0d1020),
    surface: colour("--c-surface", 0x151a33),
    surface2: colour("--c-surface-2", 0x1d2345),
    text: colour("--c-text", 0xf2f4ff),
    textMuted: colour("--c-text-muted", 0xa9b1d6),
    border: colour("--c-border", 0x6f78a8),
    primary: colour("--c-primary", 0xff6b8a),
    onPrimary: colour("--c-on-primary", 0x1a0610),
    accent: colour("--c-accent", 0x4ddceb),
    xp: colour("--c-xp", 0xffc857),
  };
}

/** True when the learner asked for less motion, in the OS or with Focus mode. */
export function prefersReducedMotion(): boolean {
  return (
    window.matchMedia("(prefers-reduced-motion: reduce)").matches ||
    document.documentElement.dataset.focus === "on"
  );
}
