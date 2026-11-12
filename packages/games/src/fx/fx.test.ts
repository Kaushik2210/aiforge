import { describe, expect, it } from "vitest";
import { backOut, clamp01, easeOutCubic, heldFrame, steppedTime } from "./ease";
import { FlashLimiter } from "./flash";
import { FxKit } from "./kit";
import { speedLines, type SpeedLineSpec } from "./lines";
import { MAX_HIT_STOP_MS, effectiveLevel, strength } from "./mode";
import { decayTrauma, shakeOffset } from "./shake";

const run = (kit: FxKit, totalMs: number, stepMs = 16) => {
  const frames = [];
  for (let t = 0; t < totalMs; t += stepMs) frames.push(kit.update(stepMs));
  return frames;
};

describe("mode", () => {
  it("reduced motion forces level 0, whatever the level", () => {
    expect(effectiveLevel({ level: 3, reducedMotion: true })).toBe(0);
    expect(effectiveLevel({ level: 3, reducedMotion: false })).toBe(3);
  });
  it("strength rises with the level and is 0 when off", () => {
    expect(strength(0)).toBe(0);
    expect(strength(1)).toBeLessThan(strength(2));
    expect(strength(2)).toBeLessThan(strength(3));
  });
});

describe("ease", () => {
  it("clamps and has the right end points", () => {
    expect(clamp01(-1)).toBe(0);
    expect(clamp01(2)).toBe(1);
    expect(easeOutCubic(0)).toBe(0);
    expect(easeOutCubic(1)).toBe(1);
    expect(backOut(0)).toBeCloseTo(0, 12);
    expect(backOut(1)).toBeCloseTo(1, 12);
  });
  it("backOut overshoots 1 on the way, easeOutCubic never does", () => {
    const peak = Math.max(...Array.from({ length: 101 }, (_, i) => backOut(i / 100)));
    expect(peak).toBeGreaterThan(1.05);
    expect(Math.max(...Array.from({ length: 101 }, (_, i) => easeOutCubic(i / 100)))).toBeLessThanOrEqual(1);
  });
  it("stepped time holds each value for the right number of frames", () => {
    // on twos at 24 fps: a new value every 2 * 41.666 ms
    expect(steppedTime(0)).toBe(0);
    expect(steppedTime(80)).toBe(steppedTime(0));
    expect(steppedTime(84)).toBeGreaterThan(0);
    expect(heldFrame(0)).toBe(0);
    expect(heldFrame(83)).toBe(0);
    expect(heldFrame(84)).toBe(1);
    expect(heldFrame(250, 3)).toBe(2); // threes: 125 ms per held frame
  });
});

describe("FlashLimiter", () => {
  it("allows at most the limit in a rolling second", () => {
    const f = new FlashLimiter(2);
    expect(f.tryFlash(0)).toBe(true);
    expect(f.tryFlash(100)).toBe(true);
    expect(f.tryFlash(200)).toBe(false);
    expect(f.tryFlash(999)).toBe(false);
  });
  it("frees a slot once the oldest flash is a full window old", () => {
    const f = new FlashLimiter(2);
    f.tryFlash(0);
    f.tryFlash(100);
    expect(f.tryFlash(1000)).toBe(true); // the flash at 0 has left the window
    expect(f.tryFlash(1050)).toBe(false); // 100 is still inside it
  });
  it("never lets a caller configure beyond the WCAG limit of 3", () => {
    expect(() => new FlashLimiter(4)).toThrow(RangeError);
    expect(() => new FlashLimiter(0)).toThrow(RangeError);
    expect(() => new FlashLimiter(3)).not.toThrow();
  });
  it("any one second window holds no more than the limit (random times)", () => {
    const f = new FlashLimiter(3);
    const accepted: number[] = [];
    let t = 0;
    for (let i = 0; i < 400; i++) {
      t += (i * 37) % 90; // deterministic pseudo-random gaps of 0 to 89 ms
      if (f.tryFlash(t)) accepted.push(t);
    }
    for (const a of accepted) {
      expect(accepted.filter((b) => b >= a && b < a + 1000).length).toBeLessThanOrEqual(3);
    }
  });
});

describe("shake", () => {
  it("is zero with no trauma and grows with trauma squared", () => {
    expect(shakeOffset(0, 123)).toEqual({ x: 0, y: 0 });
    const small = Math.abs(shakeOffset(0.3, 50).x);
    const big = Math.abs(shakeOffset(0.6, 50).x);
    expect(big / small).toBeCloseTo(4, 6); // doubling trauma quadruples the offset
  });
  it("never exceeds the maximum and is deterministic", () => {
    for (let t = 0; t < 2000; t += 7) {
      const o = shakeOffset(1, t, 10);
      expect(Math.abs(o.x)).toBeLessThanOrEqual(10 + 1e-9);
      expect(Math.abs(o.y)).toBeLessThanOrEqual(10 + 1e-9);
    }
    expect(shakeOffset(0.8, 321)).toEqual(shakeOffset(0.8, 321));
  });
  it("decays to exactly zero and no lower", () => {
    expect(decayTrauma(1, 100)).toBeCloseTo(1 - 0.18, 12);
    expect(decayTrauma(0.1, 1000)).toBe(0);
  });
});

describe("speedLines", () => {
  const radial: SpeedLineSpec = { kind: "radial", cx: 200, cy: 100, w: 400, h: 200, count: 12, seed: "s" };
  const direction: SpeedLineSpec = { kind: "direction", cx: 200, cy: 100, w: 400, h: 200, angle: 0, count: 10, seed: "s" };

  it("returns the requested number of lines", () => {
    expect(speedLines(radial, 0)).toHaveLength(12);
    expect(speedLines(direction, 0)).toHaveLength(10);
  });
  it("holds the same drawing for the held frames and changes on the next one (on twos)", () => {
    expect(speedLines(radial, 0)).toEqual(speedLines(radial, 80));
    expect(speedLines(radial, 0)).not.toEqual(speedLines(radial, 90));
  });
  it("is deterministic for the same seed and differs for another seed", () => {
    expect(speedLines(radial, 500)).toEqual(speedLines(radial, 500));
    expect(speedLines(radial, 500)).not.toEqual(speedLines({ ...radial, seed: "other" }, 500));
  });
  it("radial lines point away from the focus point", () => {
    for (const s of speedLines(radial, 0)) {
      const inner = Math.hypot(s.x1 - 200, s.y1 - 100);
      const outer = Math.hypot(s.x2 - 200, s.y2 - 100);
      expect(outer).toBeGreaterThan(inner);
      // start and end lie on the same ray from the centre
      const cross = (s.x1 - 200) * (s.y2 - 100) - (s.y1 - 100) * (s.x2 - 200);
      expect(Math.abs(cross)).toBeLessThan(1e-6);
    }
  });
  it("direction lines run along the motion axis and trail behind it", () => {
    for (const s of speedLines(direction, 0)) {
      expect(s.y1).toBeCloseTo(s.y2, 9); // angle 0: horizontal
      expect(s.x1).toBeLessThan(200); // behind a rightward mover
      expect(s.x2).toBeLessThan(s.x1);
    }
    const down = speedLines({ ...direction, angle: Math.PI / 2 }, 0);
    for (const s of down) {
      expect(s.x1).toBeCloseTo(s.x2, 9); // moving down: vertical lines above the focus
      expect(s.y1).toBeLessThan(100);
    }
  });
});

describe("FxKit", () => {
  it("is idle until an effect is requested", () => {
    const f = new FxKit().update(16);
    expect(f).toMatchObject({ timeScale: 1, zoom: 1, active: false, lines: [], shockwaves: [] });
  });

  it("hit-stop freezes game time for about the requested time, then releases it", () => {
    const kit = new FxKit();
    kit.hitStop(80);
    const frames = run(kit, 200, 10);
    const frozen = frames.filter((f) => f.timeScale === 0).length * 10;
    expect(frozen).toBeGreaterThanOrEqual(70);
    expect(frozen).toBeLessThanOrEqual(90);
    expect(frames.at(-1)!.timeScale).toBe(1);
    // frozen frames are contiguous from the start
    expect(frames.slice(0, 7).every((f) => f.timeScale === 0)).toBe(true);
  });

  it("caps hit-stop and keeps the longest of overlapping requests", () => {
    const kit = new FxKit({ level: 3 });
    kit.hitStop(5000);
    const frozen = run(kit, 1000, 10).filter((f) => f.timeScale === 0).length * 10;
    expect(frozen).toBeLessThanOrEqual(MAX_HIT_STOP_MS + 10);
    const k2 = new FxKit();
    k2.hitStop(100);
    k2.hitStop(20);
    expect(run(k2, 400, 10).filter((f) => f.timeScale === 0).length * 10).toBeGreaterThanOrEqual(90);
  });

  it("shake starts strong, decays to nothing and goes idle", () => {
    const kit = new FxKit();
    kit.screenShake(0.8);
    const frames = run(kit, 1500);
    const mag = (f: { shake: { x: number; y: number } }) => Math.hypot(f.shake.x, f.shake.y);
    expect(Math.max(...frames.slice(0, 5).map(mag))).toBeGreaterThan(1);
    expect(frames.at(-1)!.active).toBe(false);
    expect(mag(frames.at(-1)!)).toBe(0);
  });

  it("stacked shakes add up but trauma never exceeds 1", () => {
    const kit = new FxKit({ level: 3 });
    for (let i = 0; i < 10; i++) kit.screenShake(0.9);
    const first = kit.update(1);
    expect(Math.hypot(first.shake.x, first.shake.y)).toBeLessThanOrEqual(Math.SQRT2 * 14 + 1e-9);
  });

  it("zoom punch peaks at the start and returns to exactly 1", () => {
    const kit = new FxKit();
    kit.zoomPunch(0.06, 200);
    const frames = run(kit, 400, 10);
    expect(frames[0]!.zoom).toBeGreaterThan(1.04);
    for (let i = 1; i < 20; i++) expect(frames[i]!.zoom).toBeLessThanOrEqual(frames[i - 1]!.zoom + 1e-12);
    expect(frames.at(-1)!.zoom).toBe(1);
  });

  it("zoom amount is capped so a bad call cannot fill the screen", () => {
    const kit = new FxKit({ level: 3 });
    kit.zoomPunch(5, 200);
    expect(kit.update(1).zoom).toBeLessThanOrEqual(1.21);
  });

  it("speed lines fade out over their duration and then stop", () => {
    const kit = new FxKit();
    kit.speedLines({ kind: "radial", cx: 100, cy: 100, w: 200, h: 200, seed: "t" }, 300);
    const frames = run(kit, 500, 10);
    expect(frames[0]!.lines.length).toBeGreaterThan(0);
    expect(frames[0]!.lineAlpha).toBeGreaterThan(frames[25]!.lineAlpha);
    expect(frames.at(-1)!.lines).toEqual([]);
  });

  it("shockwave grows and fades, and the last frame is drawn once more before idling", () => {
    const kit = new FxKit();
    kit.shockwave(50, 60, { size: 100, ms: 300 });
    const frames = run(kit, 500, 10);
    const waves = frames.filter((f) => f.shockwaves.length > 0).map((f) => f.shockwaves[0]!);
    expect(waves[0]!.radius).toBeLessThan(waves.at(-1)!.radius);
    expect(waves[0]!.alpha).toBeGreaterThan(waves.at(-1)!.alpha);
    expect(waves.at(-1)!.alpha).toBeCloseTo(0, 6);
    expect(frames.at(-1)!.shockwaves).toEqual([]);
    expect(frames.at(-1)!.active).toBe(false);
  });

  it("reduced motion turns every effect off except a ring that fades in place", () => {
    const kit = new FxKit({ level: 3, reducedMotion: true });
    kit.hitStop(100);
    kit.screenShake(1);
    kit.zoomPunch(0.1, 200);
    kit.speedLines({ kind: "radial", cx: 0, cy: 0, w: 100, h: 100 }, 300);
    let f = kit.update(16);
    expect(f).toMatchObject({ timeScale: 1, zoom: 1, shake: { x: 0, y: 0 }, lines: [] });
    kit.shockwave(10, 10, { size: 100, ms: 300 });
    const frames = run(kit, 300, 10);
    const radii = new Set(frames.flatMap((fr) => fr.shockwaves.map((w) => w.radius)));
    expect(radii.size).toBe(1); // never grows
    expect(frames.flatMap((fr) => fr.shockwaves).every((w) => w.still)).toBe(true);
    f = kit.update(1000);
    expect(f.active).toBe(false);
  });

  it("level 0 is fully off, including the ring", () => {
    const kit = new FxKit({ level: 0 });
    kit.hitStop(100);
    kit.shockwave(0, 0);
    kit.screenShake(1);
    expect(kit.update(16).active).toBe(false);
  });

  it("switching to reduced motion mid-effect stops everything at once", () => {
    const kit = new FxKit();
    kit.hitStop(100);
    kit.screenShake(1);
    kit.zoomPunch(0.1, 500);
    kit.update(16);
    kit.setMode({ reducedMotion: true });
    expect(kit.update(16)).toMatchObject({ timeScale: 1, zoom: 1, active: false });
  });

  it("a long pause (a background tab) cannot skip an effect in one step", () => {
    const kit = new FxKit();
    kit.zoomPunch(0.06, 400);
    const f = kit.update(60_000); // capped to 100 ms
    expect(f.zoom).toBeGreaterThan(1);
  });

  it("negative or zero inputs are ignored", () => {
    const kit = new FxKit();
    kit.hitStop(-5);
    kit.screenShake(0);
    kit.zoomPunch(0, 100);
    expect(kit.update(16).active).toBe(false);
  });

  it("is deterministic: the same calls and times give the same frames", () => {
    const make = () => {
      const k = new FxKit();
      k.screenShake(0.7);
      k.speedLines({ kind: "direction", cx: 80, cy: 80, w: 160, h: 160, angle: 0, seed: "d" }, 400);
      return run(k, 600);
    };
    expect(make()).toEqual(make());
  });
});

describe("FxKit levels and caps (found by mutation testing)", () => {
  const frozenMs = (level: 0 | 1 | 2 | 3) => {
    const k = new FxKit({ level });
    k.hitStop(80);
    return run(k, 400, 10).filter((f) => f.timeScale === 0).length * 10;
  };
  const firstShake = (level: 0 | 1 | 2 | 3) => {
    const k = new FxKit({ level });
    k.screenShake(0.5);
    const f = k.update(1);
    return Math.hypot(f.shake.x, f.shake.y);
  };

  it("a higher level freezes longer, and level 0 not at all", () => {
    expect(frozenMs(0)).toBe(0);
    expect(frozenMs(1)).toBeLessThan(frozenMs(2));
    expect(frozenMs(2)).toBeLessThan(frozenMs(3));
  });
  it("a higher level shakes harder", () => {
    expect(firstShake(1)).toBeLessThan(firstShake(3));
    expect(firstShake(0)).toBe(0);
  });
  it("a lower level draws fewer lines", () => {
    const count = (level: 0 | 1 | 2 | 3) => {
      const k = new FxKit({ level });
      k.speedLines({ kind: "radial", cx: 0, cy: 0, w: 100, h: 100, count: 14 }, 300);
      return k.update(16).lines.length;
    };
    expect(count(1)).toBe(7);
    expect(count(2)).toBe(14);
  });
  it("stacked shake is capped, so it fades out in about half a second", () => {
    const kit = new FxKit({ level: 3 });
    for (let i = 0; i < 10; i++) kit.screenShake(0.9);
    expect(run(kit, 1000, 10).at(-1)!.active).toBe(false);
  });
  it("a negative time step is ignored, not run backwards", () => {
    const kit = new FxKit();
    kit.screenShake(0.2);
    kit.update(-5000);
    expect(run(kit, 400, 10).at(-1)!.active).toBe(false);
  });
  it("keeps at most four rings at once", () => {
    const kit = new FxKit();
    for (let i = 0; i < 10; i++) kit.shockwave(i, i);
    expect(kit.update(16).shockwaves).toHaveLength(4);
  });
  it("the zoom eases out: halfway through it is between the peak and 1", () => {
    const kit = new FxKit();
    kit.zoomPunch(0.06, 200);
    const frames = run(kit, 200, 10);
    const peak = frames[0]!.zoom;
    const mid = frames[9]!.zoom; // about 100 ms in
    expect(mid).toBeLessThan(peak - 0.005);
    expect(mid).toBeGreaterThan(1);
  });
});
