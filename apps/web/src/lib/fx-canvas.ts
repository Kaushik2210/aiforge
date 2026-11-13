import type { FxFrame } from "@aiforge/games";

/** Colours the lab scene uses, read from the page's design tokens so it follows light and dark themes. */
export interface Palette {
  bg: string;
  surface: string;
  text: string;
  primary: string;
  accent: string;
  xp: string;
}

/** The ink colour of the impact frame: a deep blue-black, never white. */
export const INK = "#0b0b1a";

export const SCENE_W = 640;
export const SCENE_H = 360;

const FALLBACK: Palette = { bg: "#0d1020", surface: "#1d2345", text: "#f2f4ff", primary: "#ff6b8a", accent: "#4ddceb", xp: "#ffc857" };

export function readPalette(): Palette {
  if (typeof document === "undefined") return FALLBACK;
  const css = getComputedStyle(document.documentElement);
  const get = (name: string, fallback: string) => css.getPropertyValue(name).trim() || fallback;
  return {
    bg: get("--c-bg", FALLBACK.bg),
    surface: get("--c-surface-2", FALLBACK.surface),
    text: get("--c-text", FALLBACK.text),
    primary: get("--c-primary", FALLBACK.primary),
    accent: get("--c-accent", FALLBACK.accent),
    xp: get("--c-xp", FALLBACK.xp),
  };
}

export interface LabScene {
  /** Where the hiker stands, in scene pixels (the scene is SCENE_W by SCENE_H). */
  hiker: { x: number; y: number };
}

/** An original lantern-bearer silhouette, drawn with plain paths so it needs no image file. */
function drawHiker(ctx: CanvasRenderingContext2D, x: number, y: number, p: Palette, alpha: number, solid: boolean) {
  ctx.save();
  ctx.globalAlpha = alpha;
  if (solid) {
    ctx.fillStyle = p.xp;
    ctx.beginPath();
    ctx.arc(x + 17, y - 10, 6, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = p.accent;
  ctx.beginPath(); // cloak
  ctx.moveTo(x - 10, y);
  ctx.lineTo(x + 10, y);
  ctx.lineTo(x, y - 14);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = solid ? p.primary : p.accent;
  ctx.beginPath(); // hair or silhouette head
  ctx.arc(x, y - 24, 12, 0, Math.PI * 2);
  ctx.fill();
  if (solid) {
    ctx.fillStyle = "#ffe3cf";
    ctx.beginPath();
    ctx.arc(x, y - 22, 9.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#1a1f36";
    ctx.beginPath();
    ctx.arc(x - 3.5, y - 22, 1.6, 0, Math.PI * 2);
    ctx.arc(x + 3.5, y - 22, 1.6, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

/**
 * Draw one frame of the effects lab: the scene with the kit's camera (zoom and
 * shake), speed lines behind the hiker, afterimages, the smeared hiker, rings, and
 * the dark impact frame over everything. `w` and `h` are the scene size in pixels.
 */
export function drawFxScene(ctx: CanvasRenderingContext2D, frame: FxFrame, scene: LabScene, p: Palette, w = SCENE_W, h = SCENE_H): void {
  ctx.save();
  ctx.fillStyle = p.bg;
  ctx.fillRect(0, 0, w, h);

  // Camera: zoom about the centre, then shake.
  ctx.translate(w / 2 + frame.shake.x, h / 2 + frame.shake.y);
  ctx.scale(frame.zoom, frame.zoom);
  ctx.translate(-w / 2, -h / 2);

  // Backdrop: flat bands and two ridges of mountains (cel shading: no gradients).
  ctx.fillStyle = p.surface;
  ctx.fillRect(-40, h * 0.42, w + 80, h * 0.6);
  ctx.fillStyle = p.accent;
  ctx.globalAlpha = 0.25;
  for (let i = 0; i < 5; i++) {
    const x = i * 150 - 40;
    ctx.beginPath();
    ctx.moveTo(x, h * 0.62);
    ctx.lineTo(x + 90, h * (0.3 + (i % 2) * 0.08));
    ctx.lineTo(x + 180, h * 0.62);
    ctx.closePath();
    ctx.fill();
  }
  ctx.globalAlpha = 1;
  ctx.fillStyle = p.text;
  ctx.globalAlpha = 0.35;
  ctx.fillRect(-40, scene.hiker.y, w + 80, 4); // the ground line
  ctx.globalAlpha = 1;

  // Speed lines sit behind the hiker.
  if (frame.lines.length > 0) {
    ctx.save();
    ctx.strokeStyle = p.text;
    ctx.globalAlpha = frame.lineAlpha * 0.6;
    ctx.lineCap = "round";
    for (const s of frame.lines) {
      ctx.lineWidth = s.width;
      ctx.beginPath();
      ctx.moveTo(s.x1, s.y1);
      ctx.lineTo(s.x2, s.y2);
      ctx.stroke();
    }
    ctx.restore();
  }

  for (const g of frame.ghosts) drawHiker(ctx, g.x, g.y, p, g.alpha, false);

  // The hiker, stretched along its direction of travel while a smear is on.
  ctx.save();
  ctx.translate(scene.hiker.x, scene.hiker.y);
  if (frame.smear) {
    ctx.rotate(frame.smear.angle);
    ctx.scale(frame.smear.along, frame.smear.across);
    ctx.rotate(-frame.smear.angle);
  }
  drawHiker(ctx, 0, 0, p, 1, true);
  ctx.restore();

  for (const wave of frame.shockwaves) {
    ctx.lineWidth = 7;
    ctx.strokeStyle = p.text;
    ctx.globalAlpha = wave.alpha * 0.9;
    ctx.beginPath();
    ctx.arc(wave.x, wave.y, Math.max(0, wave.radius), 0, Math.PI * 2);
    ctx.stroke();
    ctx.lineWidth = 4;
    ctx.strokeStyle = p.xp;
    ctx.globalAlpha = wave.alpha;
    ctx.beginPath();
    ctx.arc(wave.x, wave.y, Math.max(0, wave.radius), 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.restore();

  // The impact frame is a full-canvas dark overlay, drawn outside the camera so it always covers everything.
  if (frame.impact > 0) {
    ctx.save();
    ctx.globalAlpha = frame.impact;
    ctx.fillStyle = INK;
    ctx.fillRect(0, 0, w, h);
    ctx.restore();
  }
}
