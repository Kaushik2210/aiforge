/**
 * The learner's choice of how dramatic effects should be: 0 off, 1 low,
 * 2 normal (the default), 3 high. It is stored on <html data-fx> and in
 * localStorage, the same way the theme and Focus mode are, so it applies before
 * the page paints. Reduced motion (the OS setting) and Focus mode always win:
 * they switch effects off whatever this says.
 */
export type FxLevel = 0 | 1 | 2 | 3;

export const FX_STORAGE_KEY = "aiforge-fx";
export const DEFAULT_FX_LEVEL: FxLevel = 2;

export const FX_CHOICES: readonly { level: FxLevel; name: string; blurb: string }[] = [
  { level: 0, name: "Off", blurb: "No screen shake, freezes, banners or impact effects." },
  { level: 1, name: "Low", blurb: "Gentle: short, small effects." },
  { level: 2, name: "Normal", blurb: "The intended look." },
  { level: 3, name: "High", blurb: "Bigger, longer effects." },
];

/** Turn stored text into a level; anything unexpected becomes the default. */
export function parseFxLevel(raw: unknown): FxLevel {
  return raw === "0" || raw === 0 ? 0 : raw === "1" || raw === 1 ? 1 : raw === "2" || raw === 2 ? 2 : raw === "3" || raw === 3 ? 3 : DEFAULT_FX_LEVEL;
}

/** The level set on the page right now. Safe to call on the server (returns the default). */
export function readFxLevel(): FxLevel {
  if (typeof document === "undefined") return DEFAULT_FX_LEVEL;
  return parseFxLevel(document.documentElement.dataset.fx);
}

/** Apply and remember a level. */
export function applyFxLevel(level: FxLevel): void {
  document.documentElement.dataset.fx = String(level);
  try {
    localStorage.setItem(FX_STORAGE_KEY, String(level));
  } catch {
    /* storage blocked: the choice still applies until the page closes */
  }
}

/** How long the cut-in banner stays at each level, in milliseconds (0 means it is not shown). */
export function cutInDuration(level: FxLevel): number {
  return [0, 1200, 1800, 2400][level] ?? 0;
}
