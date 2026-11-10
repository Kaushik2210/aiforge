import * as Phaser from "phaser";
import { Rng } from "../rng";
import { biomeColor, biomeFor, mixColor, type MapTheme } from "../map/biomes";
import type { HikerSession } from "./session";
import {
  contours,
  curve1D,
  makeProjector,
  markerShape,
  overshot,
  valleys1D,
  viewBounds,
  type Bounds,
} from "./view";

export interface HikerSceneOptions {
  session: HikerSession;
  theme: MapTheme;
  /** When true: no tweens, speed lines or bursts; the ball jumps instead of gliding. */
  reducedMotion: boolean;
  seed: string;
  fontFamily: string;
}

const MARGIN = 44;
const css = (n: number) => `#${n.toString(16).padStart(6, "0")}`;

/**
 * Gradient Hiker's picture of the game. It owns no rules: it only draws what
 * the session says. Original art, drawn with Graphics and Text, so it works
 * offline: a cel-shaded Loss Mountains backdrop, a lantern-carrying hiker,
 * numbered trail markers whose shapes (circle, triangle, square) cycle so the
 * order never depends on colour, a goal zone, speed lines on overshoot and a
 * sparkle burst on a win.
 */
export class HikerScene extends Phaser.Scene {
  private staticLayer!: Phaser.GameObjects.Graphics;
  private dynLayer!: Phaser.GameObjects.Graphics;
  private hud!: Phaser.GameObjects.Text;
  private hudPlate!: Phaser.GameObjects.Graphics;
  private labels: Phaser.GameObjects.Text[] = [];
  private bounds!: Bounds;
  private proj!: ReturnType<typeof makeProjector>;
  private layoutKey = "";
  /** How many trail segments have been "walked" so far (fractional while animating). */
  private progress = 0;
  private walk: Phaser.Tweens.Tween | null = null;
  private fx = { speed: 0, burst: 0 };
  private cleanups: (() => void)[] = [];

  constructor(private readonly opts: HikerSceneOptions) {
    super({ key: "gradient-hiker" });
  }

  create() {
    this.staticLayer = this.add.graphics().setDepth(0);
    this.dynLayer = this.add.graphics().setDepth(5);
    this.hudPlate = this.add.graphics().setDepth(9);
    this.hud = this.add
      .text(14, 10, "", { fontFamily: this.opts.fontFamily, fontSize: "16px", fontStyle: "bold", color: css(this.opts.theme.text), lineSpacing: 4 })
      .setDepth(10);

    const off = this.opts.session.events.on("change", () => this.sync());
    const onResize = () => {
      this.layoutKey = "";
      this.sync();
    };
    this.scale.on("resize", onResize);
    this.cleanups.push(off, () => this.scale.off("resize", onResize));
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.release());
    this.events.once(Phaser.Scenes.Events.DESTROY, () => this.release());
    this.sync();
  }

  /* ------------------------------------------------------------- syncing */

  private levelKey(): string {
    const { level } = this.opts.session.snapshot;
    return `${level.id}|${level.start.join(",")}|${level.landscape.curvatures?.join(",") ?? ""}|${this.scale.width}x${this.scale.height}`;
  }

  /** Bring the picture up to date with the session. */
  private sync() {
    const snap = this.opts.session.snapshot;
    const key = this.levelKey();
    if (key !== this.layoutKey) {
      this.layoutKey = key;
      this.walk?.stop();
      this.progress = 0;
      this.drawStatic();
    }

    const target = snap.state.trail.length - 1;
    if (target < this.progress) this.progress = target; // reset: jump back to the start
    if (target > this.progress) this.walkTo(target, snap.state.status);
    this.drawDynamic();
  }

  /** Glide along the new trail points one after another (instantly under reduced motion). */
  private walkTo(target: number, status: string) {
    const snap = this.opts.session.snapshot;
    this.walk?.stop();
    if (this.opts.reducedMotion) {
      this.progress = target;
      return;
    }
    const from = this.progress;
    const duration = Math.min(2400, 260 * (target - from));
    this.walk = this.tweens.addCounter({
      from,
      to: target,
      duration,
      ease: "Sine.easeInOut",
      onUpdate: (tween) => {
        this.progress = tween.getValue() ?? target;
        this.drawDynamic();
      },
      onComplete: () => {
        this.progress = target;
        this.celebrate(status, overshot(snap.state.losses));
        this.drawDynamic();
      },
    });
  }

  private celebrate(status: string, overshoot: boolean) {
    if (this.opts.reducedMotion) return;
    if (status === "won") {
      this.fx.burst = 0;
      this.tweens.addCounter({ from: 0, to: 1, duration: 800, ease: "Cubic.easeOut", onUpdate: (t) => { this.fx.burst = t.getValue() ?? 1; this.drawDynamic(); } });
    } else if (overshoot) {
      this.fx.speed = 1;
      this.tweens.addCounter({ from: 1, to: 0, duration: 450, onUpdate: (t) => { this.fx.speed = t.getValue() ?? 0; this.drawDynamic(); } });
    }
  }

  /* ------------------------------------------------------------- drawing */

  private drawStatic() {
    const { theme, seed } = this.opts;
    const { level } = this.opts.session.snapshot;
    const w = this.scale.width;
    const h = this.scale.height;
    const g = this.staticLayer;
    g.clear();
    for (const l of this.labels.splice(0)) l.destroy();

    this.bounds = viewBounds(level);
    this.proj = makeProjector(this.bounds, { width: w, height: h, margin: MARGIN });
    const p = this.proj;
    const mountain = biomeColor(theme, biomeFor(2), 0.5);

    // Sky and distant Loss Mountains (flat colour bands: cel shading).
    g.fillStyle(mixColor(theme.bg, theme.accent, 0.1), 1).fillRect(0, 0, w, h);
    g.fillStyle(mixColor(theme.bg, theme.primary, 0.1), 1).fillRect(0, h * 0.45, w, h * 0.55);
    const rng = new Rng(`${seed}:mountains`);
    for (let ridge = 0; ridge < 2; ridge++) {
      g.fillStyle(mixColor(mountain, theme.bg, 0.25 + ridge * 0.25), 1);
      let x = -20;
      while (x < w + 40) {
        const width = rng.range(90, 170);
        const height = rng.range(h * 0.12, h * 0.3) * (ridge === 0 ? 1.2 : 0.8);
        const base = h * (0.62 + ridge * 0.06);
        g.fillTriangle(x, base, x + width / 2, base - height, x + width, base);
        x += width * 0.7;
      }
    }

    if (level.landscape.dims === 1) this.drawStatic1D(g);
    else this.drawStatic2D(g);

    // Start flag.
    const sx = p.x(level.start[0]!);
    const sy = level.landscape.dims === 1 ? p.y(Math.min(level.landscape.loss(level.start), this.bounds.yMax)) : p.y(level.start[1]!);
    g.lineStyle(3, theme.text, 1).lineBetween(sx, sy, sx, sy - 34);
    g.fillStyle(theme.primary, 1).fillTriangle(sx, sy - 34, sx + 20, sy - 27, sx, sy - 20);
  }

  private drawStatic1D(g: Phaser.GameObjects.Graphics) {
    const { theme } = this.opts;
    const { level } = this.opts.session.snapshot;
    const p = this.proj;
    const pts = curve1D(level, this.bounds);
    const bottom = p.y(this.bounds.yMin);

    // Goal zone (loss mode): everything at or below the target loss.
    if (level.mode === "loss") {
      const top = p.y(level.target);
      g.fillStyle(theme.xp, 0.22).fillRect(MARGIN / 2, top, this.scale.width - MARGIN, bottom - top);
      g.lineStyle(2, theme.xp, 0.9).lineBetween(MARGIN / 2, top, this.scale.width - MARGIN / 2, top);
      this.label(MARGIN / 2 + 4, top - 18, `Goal: loss under ${level.target}`, theme.text, 14);
    }

    // Ground: a flat filled shape under the curve, with a bold outline.
    g.fillStyle(biomeColor(theme, biomeFor(2), 0.6), 1);
    g.beginPath().moveTo(p.x(pts[0]!.x), bottom);
    for (const pt of pts) g.lineTo(p.x(pt.x), p.y(pt.y));
    g.lineTo(p.x(pts.at(-1)!.x), bottom).closePath().fillPath();
    g.lineStyle(5, theme.text, 1).beginPath().moveTo(p.x(pts[0]!.x), p.y(pts[0]!.y));
    for (const pt of pts) g.lineTo(p.x(pt.x), p.y(pt.y));
    g.strokePath();

    // Level 4: name the valleys so "deeper" is visible, not just claimed.
    if (level.basins) {
      const v = valleys1D(level, this.bounds);
      const deepest = Math.min(...v.map((q) => q.y));
      for (const q of v) {
        this.label(p.x(q.x) - 44, p.y(q.y) + 14, q.y === deepest ? "deeper valley" : "shallower valley", theme.text, 14);
      }
    }
  }

  private drawStatic2D(g: Phaser.GameObjects.Graphics) {
    const { theme } = this.opts;
    const { level } = this.opts.session.snapshot;
    const p = this.proj;
    const cx = p.x(0);
    const cy = p.y(0);
    const rings = contours(level, 6);
    rings.forEach((e, i) => {
      const shade = mixColor(biomeColor(theme, biomeFor(2), 0.6), theme.xp, i / (rings.length * 1.6));
      g.fillStyle(shade, 1).fillEllipse(cx, cy, e.rx * 2 * p.scaleX, e.ry * 2 * p.scaleY, 48);
      g.lineStyle(2, theme.text, 0.55).strokeEllipse(cx, cy, e.rx * 2 * p.scaleX, e.ry * 2 * p.scaleY, 48);
    });
    g.lineStyle(1, theme.textMuted, 0.6).lineBetween(MARGIN / 2, cy, this.scale.width - MARGIN / 2, cy).lineBetween(cx, MARGIN / 2, cx, this.scale.height - MARGIN / 2);

    // Goal contour: loss = target. Anywhere inside it wins.
    const c = level.landscape.curvatures!;
    const rx = Math.sqrt((2 * level.target) / c[0]!);
    const ry = Math.sqrt((2 * level.target) / c[1]!);
    g.lineStyle(4, theme.xp, 1).strokeEllipse(cx, cy, rx * 2 * p.scaleX, ry * 2 * p.scaleY, 48);
    g.fillStyle(theme.xp, 0.35).fillEllipse(cx, cy, rx * 2 * p.scaleX, ry * 2 * p.scaleY, 48);
    this.label(cx + 8, cy + 8, "goal", theme.text, 14);
  }

  private label(x: number, y: number, text: string, color: number, size: number) {
    const t = this.add
      .text(x, y, text, { fontFamily: this.opts.fontFamily, fontSize: `${size}px`, fontStyle: "bold", color: css(color) })
      .setDepth(2);
    this.labels.push(t);
  }

  /** Screen position of trail point `i`. */
  private screenAt(i: number): { x: number; y: number } {
    const snap = this.opts.session.snapshot;
    const pos = snap.state.trail[i]!;
    const p = this.proj;
    const clampX = (x: number) => Math.min(this.scale.width - 8, Math.max(8, x));
    if (snap.level.landscape.dims === 1) {
      return { x: clampX(p.x(pos[0]!)), y: p.y(Math.min(snap.state.losses[i]!, this.bounds.yMax)) };
    }
    return { x: clampX(p.x(pos[0]!)), y: Math.min(this.scale.height - 8, Math.max(8, p.y(pos[1]!))) };
  }

  private drawDynamic() {
    const { theme } = this.opts;
    const snap = this.opts.session.snapshot;
    const g = this.dynLayer;
    g.clear();

    const whole = Math.floor(this.progress);
    const frac = this.progress - whole;
    const pts = Array.from({ length: whole + 1 }, (_, i) => this.screenAt(i));
    let ball = pts[whole]!;
    if (frac > 0 && whole + 1 < snap.state.trail.length) {
      const next = this.screenAt(whole + 1);
      ball = { x: ball.x + (next.x - ball.x) * frac, y: ball.y + (next.y - ball.y) * frac };
    }

    // Trail line, then shape-coded markers on top.
    g.lineStyle(4, theme.bg, 1);
    for (let i = 1; i < pts.length; i++) g.lineBetween(pts[i - 1]!.x, pts[i - 1]!.y, pts[i]!.x, pts[i]!.y);
    g.lineStyle(2.5, theme.primary, 1);
    for (let i = 1; i < pts.length; i++) g.lineBetween(pts[i - 1]!.x, pts[i - 1]!.y, pts[i]!.x, pts[i]!.y);
    pts.forEach((pt, i) => this.marker(g, pt.x, pt.y, i));

    if (this.fx.speed > 0 && !this.opts.reducedMotion) this.speedLines(g, ball);
    this.hiker(g, ball.x, ball.y, snap.state.status);
    if (snap.state.status === "won") this.star(g, ball.x, ball.y - 54, 12);
    if (this.fx.burst > 0 && this.fx.burst < 1 && !this.opts.reducedMotion) this.sparkles(g, ball.x, ball.y - 20, this.fx.burst);

    const s = snap.state;
    const status = s.status === "running" ? "" : s.status === "won" ? "  Goal reached!" : s.status === "diverged" ? "  Flew off the map" : "  Out of steps";
    this.hud.setText(`Level ${snap.level.id}: ${snap.level.title}\nStep ${s.steps}/${snap.level.budget}   Loss ${s.losses.at(-1)!.toFixed(2)}${status}`);
    // A backing plate keeps the text readable wherever the landscape passes behind it.
    this.hudPlate.clear().fillStyle(theme.bg, 0.82).fillRoundedRect(8, 5, this.hud.width + 12, this.hud.height + 10, 8);
  }

  private marker(g: Phaser.GameObjects.Graphics, x: number, y: number, i: number) {
    const { theme } = this.opts;
    const r = i === 0 ? 7 : 6;
    g.fillStyle(theme.surface, 1).lineStyle(2.5, theme.text, 1);
    switch (markerShape(i)) {
      case "circle":
        g.fillCircle(x, y, r).strokeCircle(x, y, r);
        break;
      case "triangle":
        g.fillTriangle(x, y - r - 1, x - r - 1, y + r, x + r + 1, y + r).strokeTriangle(x, y - r - 1, x - r - 1, y + r, x + r + 1, y + r);
        break;
      case "square":
        g.fillRect(x - r, y - r, r * 2, r * 2).strokeRect(x - r, y - r, r * 2, r * 2);
        break;
    }
  }

  /** The hiker: an original lantern-bearer with a face that reacts to how the run is going. */
  private hiker(g: Phaser.GameObjects.Graphics, x: number, y: number, status: string) {
    const { theme } = this.opts;
    const skin = 0xffe3cf;
    const head = { x, y: y - 22 };
    g.fillStyle(theme.xp, 0.3).fillCircle(x + 17, y - 10, 15); // lantern glow
    g.fillStyle(theme.xp, 1).fillCircle(x + 17, y - 10, 6);
    g.lineStyle(2, theme.text, 1).lineBetween(x + 6, y - 14, x + 15, y - 12);
    g.fillStyle(theme.accent, 1).fillTriangle(x - 10, y, x + 10, y, x, y - 14); // cloak
    g.fillStyle(theme.primary, 1).fillCircle(head.x, head.y - 2, 12.5); // hair
    g.fillStyle(skin, 1).fillCircle(head.x, head.y, 10.5); // face
    g.fillStyle(theme.primary, 1).fillTriangle(head.x - 11, head.y - 4, head.x, head.y - 14, head.x + 11, head.y - 4); // fringe
    g.fillStyle(0x1a1f36, 1);
    const happy = status === "won";
    const worried = status === "diverged" || status === "lost";
    if (happy) {
      // Closed, smiling eyes.
      g.lineStyle(2, 0x1a1f36, 1).lineBetween(head.x - 6, head.y, head.x - 2, head.y - 2).lineBetween(head.x - 2, head.y - 2, head.x - 6, head.y - 3);
      g.lineBetween(head.x + 2, head.y - 2, head.x + 6, head.y).lineBetween(head.x + 2, head.y - 2, head.x + 6, head.y - 3);
    } else {
      g.fillCircle(head.x - 4, head.y, 1.8).fillCircle(head.x + 4, head.y, 1.8);
    }
    g.lineStyle(1.8, 0x1a1f36, 1);
    if (happy) g.beginPath().moveTo(head.x - 4, head.y + 4).lineTo(head.x, head.y + 7).lineTo(head.x + 4, head.y + 4).strokePath();
    else if (worried) g.lineBetween(head.x - 3, head.y + 6, head.x + 3, head.y + 6).lineBetween(head.x - 6, head.y - 4, head.x - 2, head.y - 5);
    else g.lineBetween(head.x - 2, head.y + 5, head.x + 2, head.y + 5);
  }

  private star(g: Phaser.GameObjects.Graphics, x: number, y: number, r: number) {
    const { theme } = this.opts;
    g.fillStyle(theme.xp, 1).lineStyle(2.5, theme.text, 1).beginPath();
    for (let i = 0; i < 10; i++) {
      const rad = i % 2 === 0 ? r : r * 0.45;
      const a = -Math.PI / 2 + (i * Math.PI) / 5;
      const px = x + Math.cos(a) * rad;
      const py = y + Math.sin(a) * rad;
      if (i === 0) g.moveTo(px, py);
      else g.lineTo(px, py);
    }
    g.closePath().fillPath().strokePath();
  }

  private sparkles(g: Phaser.GameObjects.Graphics, x: number, y: number, t: number) {
    const { theme } = this.opts;
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * Math.PI * 2;
      const d = 18 + 56 * t;
      const s = 6 * (1 - t) + 1;
      const px = x + Math.cos(a) * d;
      const py = y + Math.sin(a) * d;
      g.fillStyle(i % 2 ? theme.xp : theme.primary, 1 - t * 0.7);
      g.fillTriangle(px, py - s * 1.6, px - s, py, px + s, py).fillTriangle(px, py + s * 1.6, px - s, py, px + s, py);
    }
  }

  private speedLines(g: Phaser.GameObjects.Graphics, ball: { x: number; y: number }) {
    const { theme } = this.opts;
    g.lineStyle(3, theme.text, this.fx.speed);
    for (let i = 0; i < 6; i++) {
      const y = ball.y - 36 + i * 11;
      g.lineBetween(ball.x - 22 - i * 6, y, ball.x - 54 - i * 10, y - 3);
    }
  }

  private release() {
    for (const fn of this.cleanups.splice(0)) fn();
    this.walk?.stop();
    this.walk = null;
  }
}
