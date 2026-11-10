import * as Phaser from "phaser";
import type { TypedEmitter } from "../events";
import { biomeColor, biomeFor, mixColor, type MapTheme } from "./biomes";
import {
  NODE_RADIUS,
  WORLD_WIDTH,
  clampCenterY,
  fitCamera,
  hitTestNode,
  layoutDecor,
  layoutRealms,
  pathPoints,
  stepFocus,
  type Decor,
  type Fit,
  type Layout,
} from "./layout";
import type { MapCommands, MapEvents, MapRealm, MapSnapshot } from "./map-types";

export interface WorldMapOptions {
  realms: MapRealm[];
  theme: MapTheme;
  /** When true: no tweens, no pulsing, instant camera moves. */
  reducedMotion: boolean;
  seed: string;
  fontFamily: string;
  events: TypedEmitter<MapEvents>;
  commands: TypedEmitter<MapCommands>;
}

const DRAG_THRESHOLD = 6;
const css = (n: number) => `#${n.toString(16).padStart(6, "0")}`;

/**
 * The world map: 23 realms along a winding path, one biome band each.
 * Drawn only with Graphics and Text (no downloaded art), so it works offline.
 * Nothing here ever locks a realm: "coming soon" realms sit under a light fog
 * but can still be focused and read.
 */
export class WorldMapScene extends Phaser.Scene {
  private layout!: Layout;
  private decor: Decor[] = [];
  private fit!: Fit;
  private centerY = 0;
  private focusedIndex = 0;
  private ring!: Phaser.GameObjects.Graphics;
  private centerTween: Phaser.Tweens.Tween | null = null;
  private cleanups: (() => void)[] = [];

  constructor(private readonly opts: WorldMapOptions) {
    super({ key: "world-map" });
  }

  create() {
    const { realms, theme } = this.opts;
    try {
      this.layout = layoutRealms(realms.length);
      this.decor = layoutDecor(this.layout, this.opts.seed);
      this.cameras.main.setBackgroundColor(theme.bg);

      this.drawBands();
      this.drawDecor();
      this.drawFog();
      this.drawPath();
      this.drawNodes();

      this.ring = this.add.graphics().setDepth(20);

      const frontier = this.frontierIndex();
      this.focusedIndex = frontier;
      this.fit = fitCamera(this.scale.width, this.scale.height, this.layout.worldHeight);
      this.centerY = clampCenterY(this.fit, this.layout.nodes[frontier]!.y);
      this.applyCamera();
      this.drawRing();

      this.wireInput();
      this.wireCommands();

      const onResize = () => this.refit();
      this.scale.on("resize", onResize);
      this.cleanups.push(() => this.scale.off("resize", onResize));
      this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.release());
      this.events.once(Phaser.Scenes.Events.DESTROY, () => this.release());

      this.opts.events.emit("ready", { nodes: realms.length });
      this.opts.events.emit("realm:focus", { n: realms[frontier]!.n });
    } catch (error) {
      this.opts.events.emit("error", { message: error instanceof Error ? error.message : String(error) });
    }
  }

  /* ---------------------------------------------------------------- state */

  /** Index of the furthest realm that has content (where the learner can play). */
  private frontierIndex(): number {
    let idx = 0;
    this.opts.realms.forEach((r, i) => {
      if (r.open) idx = i;
    });
    return idx;
  }

  getSnapshot(): MapSnapshot {
    return {
      focused: this.opts.realms[this.focusedIndex]?.n ?? 0,
      zoom: this.cameras.main.zoom,
      centerY: this.centerY,
      nodes: this.layout.nodes.map((n) => ({ n: n.n, x: n.x, y: n.y })),
    };
  }

  /** Scroll the map by `dy` screen pixels. Returns false if it is already at the end (so the page can scroll instead). */
  panBy(dy: number): boolean {
    const next = clampCenterY(this.fit, this.centerY + dy / this.fit.zoom);
    if (next === this.centerY) return false;
    this.centerTween?.stop();
    this.centerY = next;
    this.applyCamera();
    return true;
  }

  private applyCamera() {
    const cam = this.cameras.main;
    cam.setZoom(this.fit.zoom);
    cam.centerOn(this.fit.centerX, this.centerY);
  }

  private refit() {
    this.fit = fitCamera(this.scale.width, this.scale.height, this.layout.worldHeight);
    this.centerY = clampCenterY(this.fit, this.centerY);
    this.applyCamera();
  }

  private moveCenterTo(y: number) {
    const target = clampCenterY(this.fit, y);
    this.centerTween?.stop();
    if (this.opts.reducedMotion || Math.abs(target - this.centerY) < 1) {
      this.centerY = target;
      this.applyCamera();
      return;
    }
    this.centerTween = this.tweens.add({
      targets: this,
      centerY: target,
      duration: 320,
      ease: "Cubic.easeOut",
      onUpdate: () => this.applyCamera(),
    });
  }

  /* -------------------------------------------------------------- focusing */

  private setFocus(index: number, announce = true) {
    const clamped = Math.min(this.opts.realms.length - 1, Math.max(0, index));
    const changed = clamped !== this.focusedIndex;
    this.focusedIndex = clamped;
    this.drawRing();
    const node = this.layout.nodes[clamped]!;
    const half = this.scale.height / this.fit.zoom / 2;
    if (Math.abs(node.y - this.centerY) > half * 0.7) this.moveCenterTo(node.y);
    if (changed && announce) this.opts.events.emit("realm:focus", { n: node.n });
  }

  private select(index: number) {
    this.setFocus(index, true);
    this.opts.events.emit("realm:select", { n: this.opts.realms[index]!.n });
  }

  private drawRing() {
    const { theme, reducedMotion } = this.opts;
    const node = this.layout.nodes[this.focusedIndex]!;
    this.ring.clear();
    // Two rings: the text colour (always contrasts with the page background in
    // both themes) with the gold accent on top, so focus is visible on any biome.
    this.ring.lineStyle(11, theme.text, 1).strokeCircle(node.x, node.y, NODE_RADIUS + 12);
    this.ring.lineStyle(5, theme.xp, 1).strokeCircle(node.x, node.y, NODE_RADIUS + 12);
    if (!reducedMotion) {
      this.tweens.add({ targets: this.ring, alpha: { from: 0.5, to: 1 }, duration: 220 });
    }
  }

  /* -------------------------------------------------------------- drawing */

  private drawBands() {
    const g = this.add.graphics().setDepth(0);
    for (const band of this.layout.bands) {
      const biome = biomeFor(band.n);
      g.fillStyle(biomeColor(this.opts.theme, biome), 1);
      // Extend sideways far beyond the world so wide screens never show gaps.
      g.fillRect(-4000, band.top, WORLD_WIDTH + 8000, band.bottom - band.top);
      g.lineStyle(2, mixColor(this.opts.theme.bg, this.opts.theme.border, 0.35), 0.8);
      g.lineBetween(-4000, band.top, WORLD_WIDTH + 4000, band.top);
    }
    // Biome names in the margin of each band.
    for (const band of this.layout.bands) {
      const biome = biomeFor(band.n);
      this.add
        .text(16, band.top + 12, biome.name.toUpperCase(), {
          fontFamily: this.opts.fontFamily,
          fontSize: "13px",
          fontStyle: "bold",
          color: css(this.opts.theme.textMuted),
        })
        .setDepth(1);
    }
  }

  private drawDecor() {
    const { theme } = this.opts;
    const g = this.add.graphics().setDepth(2);
    for (const d of this.decor) {
      const base = biomeColor(theme, biomeFor(d.realm), 0.5);
      const light = mixColor(base, theme.text, 0.18);
      const dark = mixColor(base, theme.bg, 0.45);
      const s = d.size;
      switch (d.kind) {
        case "hills":
          g.fillStyle(dark, 1).fillTriangle(d.x - s, d.y + s * 0.5, d.x, d.y - s * 0.7, d.x + s, d.y + s * 0.5);
          g.fillStyle(light, 1).fillTriangle(d.x - s * 0.2, d.y - s * 0.35, d.x, d.y - s * 0.7, d.x + s * 0.2, d.y - s * 0.35);
          break;
        case "trees":
          g.fillStyle(dark, 1).fillRect(d.x - s * 0.06, d.y, s * 0.12, s * 0.45);
          g.fillStyle(light, 1).fillCircle(d.x, d.y - s * 0.1, s * 0.34);
          g.fillStyle(base, 1).fillCircle(d.x - s * 0.16, d.y + s * 0.02, s * 0.22);
          break;
        case "crystals":
          g.fillStyle(light, 1).fillTriangle(d.x, d.y - s * 0.6, d.x - s * 0.25, d.y + s * 0.2, d.x + s * 0.25, d.y + s * 0.2);
          g.fillStyle(dark, 1).fillTriangle(d.x + s * 0.1, d.y - s * 0.2, d.x + s * 0.35, d.y + s * 0.35, d.x - s * 0.05, d.y + s * 0.35);
          break;
        case "towers":
          g.fillStyle(dark, 1).fillRect(d.x - s * 0.18, d.y - s * 0.3, s * 0.36, s * 0.7);
          g.fillStyle(light, 1).fillTriangle(d.x - s * 0.26, d.y - s * 0.3, d.x, d.y - s * 0.7, d.x + s * 0.26, d.y - s * 0.3);
          break;
        case "water":
          g.lineStyle(3, light, 0.8);
          for (let k = 0; k < 3; k++) {
            const yy = d.y + k * 9;
            g.beginPath().moveTo(d.x - s * 0.5, yy);
            for (let seg = 1; seg <= 4; seg++) g.lineTo(d.x - s * 0.5 + (seg * s) / 4, yy + (seg % 2 ? -4 : 4));
            g.strokePath();
          }
          break;
        case "clouds":
          g.fillStyle(light, 0.55);
          g.fillCircle(d.x, d.y, s * 0.28).fillCircle(d.x + s * 0.25, d.y + 3, s * 0.22).fillCircle(d.x - s * 0.25, d.y + 4, s * 0.2);
          break;
      }
    }
  }

  /** A light fog over realms beyond the furthest open one. It never hides or blocks them. */
  private drawFog() {
    const frontier = this.frontierIndex();
    const startBand = this.layout.bands[frontier + 1];
    if (!startBand) return;
    this.add
      .graphics()
      .setDepth(3)
      .fillStyle(this.opts.theme.bg, 0.42)
      .fillRect(-4000, startBand.top, WORLD_WIDTH + 8000, this.layout.worldHeight - startBand.top);
  }

  private drawPath() {
    const { theme } = this.opts;
    const pts = pathPoints(this.layout.nodes, 16);
    const frontierY = this.layout.nodes[this.frontierIndex()]!.y;
    const g = this.add.graphics().setDepth(5);
    for (let i = 1; i < pts.length; i++) {
      const a = pts[i - 1]!;
      const b = pts[i]!;
      const travelled = b.y <= frontierY;
      if (travelled) {
        g.lineStyle(9, theme.bg, 1).lineBetween(a.x, a.y, b.x, b.y);
        g.lineStyle(5, theme.primary, 1).lineBetween(a.x, a.y, b.x, b.y);
      } else if (i % 2 === 0) {
        // Dashed beyond the frontier: the road ahead, still being built.
        g.lineStyle(4, theme.border, 0.9).lineBetween(a.x, a.y, b.x, b.y);
      }
    }
  }

  private drawNodes() {
    const { theme, realms, fontFamily, reducedMotion } = this.opts;
    const centerX = WORLD_WIDTH / 2;
    realms.forEach((realm, i) => {
      const node = this.layout.nodes[i]!;
      const g = this.add.graphics().setDepth(10);
      // Drop shadow gives the arcade "button" look.
      g.fillStyle(theme.bg, 0.55).fillCircle(node.x + 4, node.y + 6, NODE_RADIUS);
      g.fillStyle(realm.open ? theme.primary : theme.surface2, 1).fillCircle(node.x, node.y, NODE_RADIUS);
      g.lineStyle(5, realm.open ? theme.text : theme.border, 1).strokeCircle(node.x, node.y, NODE_RADIUS);
      this.add
        .text(node.x, node.y, String(realm.n), {
          fontFamily,
          fontSize: "26px",
          fontStyle: "bold",
          color: css(realm.open ? theme.onPrimary : theme.textMuted),
        })
        .setOrigin(0.5)
        .setDepth(11);

      if (realm.open && !reducedMotion) {
        const halo = this.add.graphics().setDepth(9);
        halo.lineStyle(4, theme.primary, 0.6).strokeCircle(node.x, node.y, NODE_RADIUS + 6);
        this.tweens.add({ targets: halo, alpha: { from: 1, to: 0.15 }, scale: { from: 1, to: 1.0 }, duration: 1100, yoyo: true, repeat: -1 });
      }

      // Label sits toward the middle of the map so it never runs off the edge.
      const onRight = node.x <= centerX;
      const lx = onRight ? node.x + NODE_RADIUS + 18 : node.x - NODE_RADIUS - 18;
      const origin = onRight ? 0 : 1;
      const title = this.add
        .text(lx, node.y - 18, realm.name, {
          fontFamily,
          fontSize: "20px",
          fontStyle: "bold",
          color: css(theme.text),
          wordWrap: { width: 230 },
          align: onRight ? "left" : "right",
        })
        .setOrigin(origin, 0.5)
        .setDepth(12);
      const sub = this.add
        .text(lx, node.y + 8 + (title.height > 30 ? title.height - 24 : 0), `${realm.open ? "Open now" : "Coming soon"}  ·  ${realm.blurb}`, {
          fontFamily,
          fontSize: "14px",
          color: css(realm.open ? theme.primary : theme.textMuted),
          wordWrap: { width: 230 },
          align: onRight ? "left" : "right",
        })
        .setOrigin(origin, 0)
        .setDepth(12);

      // Backing plate so text stays readable where the path or scenery passes behind it.
      const left = Math.min(title.x - origin * title.width, sub.x - origin * sub.width) - 8;
      const right = Math.max(title.x - origin * title.width + title.width, sub.x - origin * sub.width + sub.width) + 8;
      const top = title.y - title.height / 2 - 6;
      const bottom = Math.max(sub.y + sub.height, title.y + title.height / 2) + 6;
      this.add
        .graphics()
        .setDepth(8)
        .fillStyle(theme.bg, 0.78)
        .fillRoundedRect(left, top, right - left, bottom - top, 10);
    });
  }

  /* ---------------------------------------------------------------- input */

  private wireInput() {
    let startY = 0;
    let startCenter = 0;
    let pressed = false;
    let dragging = false;

    const onDown = (p: Phaser.Input.Pointer) => {
      pressed = true;
      dragging = false;
      startY = p.y;
      startCenter = this.centerY;
      this.centerTween?.stop();
    };
    const onMove = (p: Phaser.Input.Pointer) => {
      if (!pressed || !p.isDown) return;
      if (!dragging && Math.abs(p.y - startY) > DRAG_THRESHOLD) dragging = true;
      if (dragging) {
        this.centerY = clampCenterY(this.fit, startCenter - (p.y - startY) / this.fit.zoom);
        this.applyCamera();
      }
    };
    const onUp = (p: Phaser.Input.Pointer) => {
      const wasDrag = dragging;
      pressed = false;
      dragging = false;
      if (wasDrag) return;
      const world = this.cameras.main.getWorldPoint(p.x, p.y);
      const hit = hitTestNode(this.layout.nodes, world.x, world.y);
      if (hit) this.select(hit.n - 1);
    };

    this.input.on("pointerdown", onDown);
    this.input.on("pointermove", onMove);
    this.input.on("pointerup", onUp);
    this.input.on("pointerupoutside", onUp);
    this.cleanups.push(() => {
      this.input.off("pointerdown", onDown);
      this.input.off("pointermove", onMove);
      this.input.off("pointerup", onUp);
      this.input.off("pointerupoutside", onUp);
    });
  }

  private wireCommands() {
    const { commands, realms } = this.opts;
    this.cleanups.push(
      commands.on("focus:step", ({ delta }) => this.setFocus(stepFocus(this.focusedIndex, delta, realms.length))),
      commands.on("focus:set", ({ n }) => this.setFocus(n - 1)),
      commands.on("select:focused", () => this.select(this.focusedIndex)),
      commands.on("pan:by", ({ dy }) => void this.panBy(dy)),
    );
  }

  private release() {
    for (const fn of this.cleanups.splice(0)) fn();
    this.centerTween?.stop();
    this.centerTween = null;
  }
}
