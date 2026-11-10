import { describe, expect, it, vi } from "vitest";
import { LR_MAX, LR_MIN } from "./logic";
import { HikerSession, type HikerResult, type HikerSnapshot } from "./session";

function watch(session: HikerSession) {
  const changes: HikerSnapshot[] = [];
  const results: HikerResult[] = [];
  session.events.on("change", (s) => changes.push(s));
  session.events.on("complete", (r) => results.push(r));
  return { changes, results };
}

describe("controls", () => {
  it("clamps the learning rate to the slider range and ignores junk", () => {
    const s = new HikerSession();
    s.setLr(99);
    expect(s.snapshot.lr).toBe(LR_MAX);
    s.setLr(-1);
    expect(s.snapshot.lr).toBe(LR_MIN);
    s.setLr(0.3);
    s.setLr(NaN);
    expect(s.snapshot.lr).toBe(0.3);
  });

  it("momentum only exists from level 3 on", () => {
    const s = new HikerSession({ levelId: 1 });
    s.setMomentum(0.8);
    expect(s.snapshot.momentum).toBe(0);
    s.setLevel(3);
    s.setMomentum(0.8);
    expect(s.snapshot.momentum).toBe(0.8);
    s.setMomentum(5);
    expect(s.snapshot.momentum).toBe(0.95);
  });

  it("changing level resets the sliders and the run", () => {
    const s = new HikerSession({ levelId: 3 });
    s.setLr(0.2);
    s.setMomentum(0.5);
    s.step();
    s.setLevel(1);
    expect(s.snapshot.level.id).toBe(1);
    expect(s.snapshot.lr).toBe(0.1);
    expect(s.snapshot.momentum).toBe(0);
    expect(s.snapshot.state.steps).toBe(0);
  });

  it("the cap follows the momentum setting", () => {
    const s = new HikerSession({ levelId: 3 });
    const base = s.snapshot.cap!;
    s.setMomentum(0.5);
    expect(s.snapshot.cap!).toBeCloseTo(base * 1.5, 12);
    expect(new HikerSession({ levelId: 4 }).snapshot.cap).toBeNull();
  });
});

describe("playing", () => {
  it("step() advances one step and announces it", () => {
    const s = new HikerSession({ levelId: 1 });
    const { changes } = watch(s);
    s.setLr(0.2);
    s.step();
    expect(s.snapshot.state.steps).toBe(1);
    expect(s.snapshot.state.pos[0]).toBeCloseTo(6, 12);
    expect(changes.length).toBeGreaterThanOrEqual(2); // setLr and step
  });

  it("the slider can change between steps and the next step uses it", () => {
    const s = new HikerSession({ levelId: 1 });
    s.setLr(0.1);
    s.step(); // 10 - 0.1*20 = 8
    s.setLr(0.5);
    s.step(); // 8 - 0.5*16 = 0
    expect(s.snapshot.state.pos[0]).toBeCloseTo(0, 12);
    expect(s.snapshot.state.status).toBe("won");
  });

  it("run() plays to the end in one go", () => {
    const s = new HikerSession({ levelId: 1 });
    s.setLr(0.2);
    s.run();
    expect(s.snapshot.state.status).toBe("won");
    expect(s.snapshot.score).toBeGreaterThan(0.6);
  });

  it("does nothing once the run is over", () => {
    const s = new HikerSession({ levelId: 1 });
    s.setLr(0.5);
    s.run();
    const { changes } = watch(s);
    s.step();
    s.run();
    expect(changes).toHaveLength(0);
  });
});

describe("completion", () => {
  it("reports a win exactly once, with the level, score and duration", () => {
    let t = 1000;
    const s = new HikerSession({ levelId: 1, now: () => t });
    const { results } = watch(s);
    s.setLr(0.1);
    s.step();
    t = 4500;
    s.setLr(0.5);
    s.step();
    s.step();
    s.run();
    expect(results).toHaveLength(1);
    expect(results[0]).toMatchObject({ levelId: 1, won: true, durationMs: 3500 });
    expect(results[0]!.score).toBeGreaterThan(0);
  });

  it("reports a loss and a divergence as won: false with score 0", () => {
    const slow = new HikerSession({ levelId: 1 });
    const a = watch(slow);
    slow.setLr(LR_MIN);
    slow.run();
    expect(a.results).toEqual([expect.objectContaining({ won: false, score: 0 })]);

    const fast = new HikerSession({ levelId: 2 });
    const b = watch(fast);
    fast.setLr(LR_MAX);
    fast.run();
    expect(b.results[0]!.won).toBe(false);
  });

  it("reset allows a new result to be reported", () => {
    const s = new HikerSession({ levelId: 1 });
    const { results } = watch(s);
    s.setLr(0.5);
    s.run();
    s.reset();
    expect(s.snapshot.state.steps).toBe(0);
    s.run();
    expect(results).toHaveLength(2);
  });
});

describe("seeds", () => {
  it("the same seed gives the same boss, reseed gives a new one", () => {
    const a = new HikerSession({ levelId: 5, seed: "x" });
    const b = new HikerSession({ levelId: 5, seed: "x" });
    expect(a.snapshot.level.landscape.curvatures).toEqual(b.snapshot.level.landscape.curvatures);
    const before = String(a.snapshot.level.landscape.curvatures) + String(a.snapshot.level.start);
    let differs = false;
    for (let i = 0; i < 5 && !differs; i++) {
      a.reseed();
      differs = String(a.snapshot.level.landscape.curvatures) + String(a.snapshot.level.start) !== before;
    }
    expect(differs).toBe(true);
  });

  it("reseed resets the run", () => {
    const s = new HikerSession({ levelId: 4, seed: 3 });
    s.setLr(0.05);
    s.step();
    s.reseed();
    expect(s.snapshot.state.steps).toBe(0);
  });
});

describe("cleanup", () => {
  it("dispose removes every listener", () => {
    const s = new HikerSession();
    const fn = vi.fn();
    s.events.on("change", fn);
    s.dispose();
    s.setLr(0.3);
    expect(fn).not.toHaveBeenCalled();
    expect(s.events.listenerCount()).toBe(0);
  });
});
