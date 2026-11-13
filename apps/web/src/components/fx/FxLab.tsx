"use client";

import { FxKit, type FxFrame } from "@aiforge/games";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { CutIn } from "@/components/fx/CutIn";
import { DEFAULT_FX_LEVEL, FX_CHOICES, bannersEnabled, cutInDuration, readFxLevel, type FxLevel } from "@/lib/effects";
import { SCENE_H, SCENE_W, drawFxScene, readPalette, type Palette } from "@/lib/fx-canvas";
import { prefersReducedMotion } from "@/lib/map-data";

const btn =
  "tap rounded-[var(--radius)] border-2 border-border bg-surface px-4 font-semibold text-text hover:border-primary";

const HOME = { x: 90, y: 270 };
const DASH_TO = 550;
const DASH_MS = 650;
const IDLE_FRAME: FxFrame = { timeScale: 1, shake: { x: 0, y: 0 }, zoom: 1, lines: [], lineAlpha: 0, shockwaves: [], ghosts: [], impact: 0, smear: null, active: false };

type EffectName =
  | "Hit stop"
  | "Screen shake"
  | "Zoom punch"
  | "Speed lines"
  | "Focus lines"
  | "Shockwave"
  | "Smear and afterimages"
  | "Impact frame"
  | "Boss defeated combo";

/**
 * The effects lab: every effect from the FX kit on one small canvas, to preview
 * them, compare the effect levels, and slow them down or pause to study a frame.
 * The scene is decoration (hidden from screen readers); every button announces
 * what it played in text. Under reduced motion or with effects Off the buttons
 * still work but play nothing, and the page says so.
 */
export function FxLab() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const kitRef = useRef<FxKit | null>(null);
  const frameRef = useRef<FxFrame>(IDLE_FRAME);
  const paletteRef = useRef<Palette | null>(null);
  const hikerRef = useRef({ ...HOME });
  const dashRef = useRef<{ t: number } | null>(null);
  const dirtyRef = useRef(true);
  const rateRef = useRef(1);
  const pausedRef = useRef(false);

  // Start from the default and read the saved choice in the effect: the server cannot know it, and a
  // different first render would be a hydration mismatch, which makes React discard the page's <html> attributes.
  const [level, setLevel] = useState<FxLevel>(DEFAULT_FX_LEVEL);
  const [off, setOff] = useState(false);
  const [slow, setSlow] = useState(false);
  const [paused, setPaused] = useState(false);
  const [played, setPlayed] = useState("");
  const [banner, setBanner] = useState<number | null>(null);
  const endBanner = useCallback(() => setBanner(null), []);

  // Create the kit, follow the page's effect level, reduced-motion and theme, and run the frame loop.
  useEffect(() => {
    const kit = new FxKit({ level: readFxLevel(), reducedMotion: prefersReducedMotion() });
    kitRef.current = kit;
    paletteRef.current = readPalette();

    const sync = () => {
      const l = readFxLevel();
      const reduced = prefersReducedMotion();
      kit.setMode({ level: l, reducedMotion: reduced });
      setLevel(l);
      setOff(l === 0 || reduced);
      paletteRef.current = readPalette();
      dirtyRef.current = true;
    };
    sync();
    const observer = new MutationObserver(sync);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme", "data-focus", "data-fx"] });
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    mq.addEventListener("change", sync);
    const mqDark = window.matchMedia("(prefers-color-scheme: dark)");
    mqDark.addEventListener("change", sync);

    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d") ?? null;
    let raf = 0;
    let last = performance.now();

    const tick = (now: number) => {
      raf = requestAnimationFrame(tick);
      const dt = Math.min(100, now - last);
      last = now;
      if (!canvas || !ctx || !paletteRef.current) return;
      if (pausedRef.current) return; // frozen on the last frame

      const clock = dt * rateRef.current;
      const frame = kit.update(clock);
      // The dash runs on game time, so a hit-stop freezes it.
      const dash = dashRef.current;
      if (dash) {
        dash.t += clock * frame.timeScale;
        const k = Math.min(1, dash.t / DASH_MS);
        hikerRef.current.x = HOME.x + (DASH_TO - HOME.x) * (1 - Math.pow(1 - k, 3));
        kit.trace(hikerRef.current.x, hikerRef.current.y);
        if (k >= 1) {
          dashRef.current = null;
          setTimeout(() => {
            hikerRef.current.x = HOME.x;
            dirtyRef.current = true;
          }, 500);
        }
      }
      const was = frameRef.current.active;
      frameRef.current = frame;
      canvas.dataset.active = frame.active || dashRef.current ? "true" : "false";
      if (frame.active || was || dashRef.current || dirtyRef.current) {
        const dpr = Math.min(2, window.devicePixelRatio || 1);
        if (canvas.width !== SCENE_W * dpr) {
          canvas.width = SCENE_W * dpr;
          canvas.height = SCENE_H * dpr;
        }
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        drawFxScene(ctx, frame, { hiker: hikerRef.current }, paletteRef.current);
        dirtyRef.current = false;
      }
    };
    raf = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(raf);
      observer.disconnect();
      mq.removeEventListener("change", sync);
      mqDark.removeEventListener("change", sync);
      kitRef.current = null;
    };
  }, []);

  const play = useCallback((name: EffectName) => {
    const kit = kitRef.current;
    if (!kit) return;
    const w = SCENE_W;
    const h = SCENE_H;
    const hk = hikerRef.current;
    switch (name) {
      case "Hit stop":
        kit.hitStop(120);
        break;
      case "Screen shake":
        kit.screenShake(0.7);
        break;
      case "Zoom punch":
        kit.zoomPunch(0.08, 320);
        break;
      case "Speed lines":
        kit.speedLines({ kind: "direction", cx: hk.x, cy: hk.y - 14, w, h, angle: 0, count: 12, seed: "lab-speed" }, 600);
        break;
      case "Focus lines":
        kit.speedLines({ kind: "radial", cx: hk.x, cy: hk.y - 20, w, h, count: 18, seed: "lab-focus" }, 600);
        break;
      case "Shockwave":
        kit.shockwave(hk.x, hk.y - 20, { size: 150, ms: 700 });
        break;
      case "Smear and afterimages":
        hk.x = HOME.x;
        dashRef.current = { t: 0 };
        kit.smear(0, { ms: 180, stretch: 2.2 });
        kit.speedLines({ kind: "direction", cx: HOME.x, cy: hk.y - 14, w, h, angle: 0, count: 10, seed: "lab-dash" }, 500);
        break;
      case "Impact frame":
        if (!kit.impactFrame()) {
          setPlayed(
            kit.level === 0
              ? "Impact frame: nothing to show, because effects are off."
              : "Impact frame skipped: it needs Normal or High effects, and only one can start each second.",
          );
          dirtyRef.current = true;
          return;
        }
        break;
      case "Boss defeated combo":
        kit.hitStop(90);
        kit.zoomPunch(0.05, 260);
        kit.screenShake(0.3);
        kit.shockwave(hk.x, hk.y - 20, { size: 150, ms: 650 });
        kit.speedLines({ kind: "radial", cx: hk.x, cy: hk.y - 20, w, h, count: 16, seed: "lab-boss" }, 420);
        kit.impactFrame();
        break;
    }
    dirtyRef.current = true;
    setPlayed(kit.level === 0 ? `Played: ${name}. Nothing is shown because effects are off.` : `Played: ${name}.`);
  }, []);

  const levelName = FX_CHOICES.find((c) => c.level === level)?.name ?? "Normal";
  const effects: EffectName[] = [
    "Hit stop",
    "Screen shake",
    "Zoom punch",
    "Speed lines",
    "Focus lines",
    "Shockwave",
    "Smear and afterimages",
    "Impact frame",
    "Boss defeated combo",
  ];

  return (
    <div className="space-y-5">
      <canvas
        ref={canvasRef}
        width={SCENE_W}
        height={SCENE_H}
        aria-hidden="true"
        data-active="false"
        data-fx-level={off ? 0 : level}
        className="w-full max-w-3xl rounded-[var(--radius)] border-2 border-border bg-surface-2"
        style={{ aspectRatio: `${SCENE_W} / ${SCENE_H}` }}
      />

      <div role="status" aria-live="polite" className="min-h-6 font-semibold">
        {played}
      </div>

      {off && (
        <p role="note" className="rounded-[var(--radius)] border-2 border-border bg-surface p-3">
          Effects are off right now because of your settings (the effects level is {levelName}, or reduced motion or Focus
          mode is on). The buttons still work but play nothing. Change it in <Link href="/settings/" className="underline">Settings</Link>.
        </p>
      )}

      <div role="group" aria-label="Effects to play" className="flex flex-wrap gap-3">
        {effects.map((name) => (
          <button key={name} type="button" className={btn} onClick={() => play(name)}>
            {name}
          </button>
        ))}
        <button
          type="button"
          className={btn}
          onClick={() => {
            if (!bannersEnabled()) {
              setPlayed("Banners are off at this effects level, or under reduced motion or Focus mode.");
              return;
            }
            setBanner(Date.now());
            setPlayed("Played: level-up banner.");
          }}
        >
          Level-up banner
        </button>
      </div>

      <div role="group" aria-label="Study tools" className="flex flex-wrap items-center gap-5">
        <label className="tap flex items-center gap-2">
          <input
            type="checkbox"
            checked={slow}
            onChange={(e) => {
              setSlow(e.target.checked);
              rateRef.current = e.target.checked ? 0.25 : 1;
            }}
            className="h-4 w-4"
          />
          Slow motion (quarter speed)
        </label>
        <button
          type="button"
          className={btn}
          aria-pressed={paused}
          onClick={() => {
            pausedRef.current = !pausedRef.current;
            setPaused(pausedRef.current);
          }}
        >
          {paused ? "Resume" : "Pause on this frame"}
        </button>
      </div>

      <p className="max-w-prose text-sm text-text-muted">
        Effects level: <strong className="text-text">{off ? "Off" : levelName}</strong>. The picture is decoration:
        a small hiker on a mountain path. Each button plays one effect from AIForge's effect kit. Nothing here flashes
        white; the impact frame is a short dark ink overlay and at most one can start each second.
      </p>

      {banner !== null && <CutIn key={banner} title="LEVEL UP" subtitle="Level 99 (a preview)" durationMs={cutInDuration(level)} onDone={endBanner} />}
    </div>
  );
}
