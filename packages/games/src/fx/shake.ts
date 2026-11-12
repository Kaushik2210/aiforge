/**
 * Trauma-style camera shake. `trauma` is 0 to 1 and decays over time; the
 * offset grows with trauma squared, so small hits barely move the camera and
 * big hits shake hard. The "noise" is a fixed mix of sine waves, so the same
 * time and trauma always give the same offset (testable, replayable).
 */
export function shakeOffset(trauma: number, tMs: number, maxPx = 14): { x: number; y: number } {
  const power = Math.min(1, Math.max(0, trauma)) ** 2;
  if (power === 0) return { x: 0, y: 0 };
  const t = tMs / 1000;
  const x = Math.sin(t * 61.3) * 0.6 + Math.sin(t * 107.9 + 1.7) * 0.4;
  const y = Math.sin(t * 73.1 + 2.3) * 0.6 + Math.sin(t * 131.7 + 0.4) * 0.4;
  return { x: x * power * maxPx, y: y * power * maxPx };
}

/** Trauma left after `dtMs` of decay at `perSecond` (default: gone in about half a second from 1). */
export function decayTrauma(trauma: number, dtMs: number, perSecond = 1.8): number {
  return Math.max(0, trauma - (perSecond * dtMs) / 1000);
}
