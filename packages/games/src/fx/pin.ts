/**
 * Keep an overlay (a HUD) visually still while the camera zooms about the
 * screen centre. A point drawn at (x, y) on screen is placed at the returned
 * position and scaled by the returned scale, so that after the camera's zoom it
 * lands exactly where it started.
 */
export function pinAgainstZoom(
  x: number,
  y: number,
  zoom: number,
  width: number,
  height: number,
): { x: number; y: number; scale: number } {
  const z = Number.isFinite(zoom) && zoom > 0 ? zoom : 1;
  const inv = 1 / z;
  const cx = width / 2;
  const cy = height / 2;
  return { x: cx + (x - cx) * inv, y: cy + (y - cy) * inv, scale: inv };
}
