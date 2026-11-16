/**
 * ASCII mode: a terminal look for the whole site. It is a style choice kept on
 * `<html data-ascii="on">` and in localStorage, the same way the theme and Focus
 * mode are, and applied before the first paint. It changes fonts, borders and a
 * few labels with CSS; it never changes what the page says or does.
 */
export const ASCII_STORAGE_KEY = "aiforge-ascii";

/** True when ASCII mode is on for this page. Safe to call on the server (returns false). */
export function readAsciiMode(): boolean {
  if (typeof document === "undefined") return false;
  return document.documentElement.dataset.ascii === "on";
}

/** Turn ASCII mode on or off and remember the choice. */
export function setAsciiMode(on: boolean): void {
  if (on) document.documentElement.dataset.ascii = "on";
  else delete document.documentElement.dataset.ascii;
  try {
    localStorage.setItem(ASCII_STORAGE_KEY, on ? "on" : "off");
  } catch {
    /* storage blocked: the choice still applies until the page closes */
  }
}

/**
 * A text progress bar such as "[####------]". `value` and `max` are clamped, a
 * non-finite number counts as zero, and a `max` of zero or less gives an empty bar.
 * At least one filled cell shows for any progress above zero, so early progress is
 * visible, and the bar is only full when value reaches max.
 */
export function asciiBar(value: number, max: number, width = 10): string {
  const w = Math.max(1, Math.min(60, Math.floor(Number.isFinite(width) ? width : 10)));
  const v = Number.isFinite(value) ? value : 0;
  const m = Number.isFinite(max) ? max : 0;
  let filled = 0;
  if (m > 0 && v > 0) {
    const ratio = Math.min(1, v / m);
    filled = ratio >= 1 ? w : Math.max(1, Math.min(w - 1, Math.round(ratio * w)));
  }
  return `[${"#".repeat(filled)}${"-".repeat(w - filled)}]`;
}
