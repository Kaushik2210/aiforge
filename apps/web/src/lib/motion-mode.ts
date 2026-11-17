/** "animated" when decorative motion is allowed, "still" for reduced motion, Focus mode or effects Off. */
export type MotionMode = "animated" | "still";

/** Read the learner's motion settings right now. Call it in the browser, after the page has loaded. */
export function readMotionMode(): MotionMode {
  const d = document.documentElement.dataset;
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  return reduced || d.focus === "on" || d.fx === "0" ? "still" : "animated";
}
