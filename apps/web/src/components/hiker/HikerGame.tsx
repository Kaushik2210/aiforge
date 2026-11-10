"use client";

import {
  GradientHiker,
  LEVEL_IDS,
  SLIDER_STEPS,
  getLevel,
  lrFromSlider,
  sliderFromLr,
  type HikerResult,
  type HikerSnapshot,
  type LevelId,
} from "@aiforge/games";
import { useCallback, useEffect, useRef, useState } from "react";
import { prefersReducedMotion, readMapTheme } from "@/lib/map-data";
import { useProgress } from "@/lib/progress-store";

const LEVEL_TITLES = LEVEL_IDS.map((id) => ({ id, title: getLevel(id).title }));
const btn =
  "tap rounded-[var(--radius)] border-2 border-border bg-surface px-4 font-semibold text-text disabled:opacity-50";

const TONE: Record<string, string> = {
  good: "text-success",
  warn: "text-text",
  bad: "text-danger",
  info: "text-text",
};

/**
 * Gradient Hiker on the page. The rules and state live in the game's session;
 * this component gives them real controls (sliders and buttons that work with a
 * keyboard and a screen reader) and an equivalent text version: the table of
 * iterates and the feedback line are always available, with or without the picture.
 */
export function HikerGame() {
  const containerRef = useRef<HTMLDivElement>(null);
  const gameRef = useRef<GradientHiker | null>(null);
  const [snap, setSnap] = useState<HikerSnapshot | null>(null);
  const [textOnly, setTextOnly] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastResult, setLastResult] = useState<HikerResult | null>(null);
  const [themeVersion, setThemeVersion] = useState(0);
  const dispatch = useProgress((s) => s.dispatch);
  const games = useProgress((s) => s.snapshot.games);

  const onComplete = useCallback(
    (r: HikerResult) => {
      setLastResult(r);
      void dispatch({ type: "game-result", id: `gradient-hiker:level-${r.levelId}`, won: r.won });
    },
    [dispatch],
  );

  // One game for the life of the page; its session survives theme changes.
  useEffect(() => {
    const game = new GradientHiker({ theme: readMapTheme(), levelId: 1, seed: "hiker-v1" });
    gameRef.current = game;
    setSnap(game.session.snapshot);
    const off = game.session.events.on("change", setSnap);
    const offDone = game.session.events.on("complete", onComplete);
    return () => {
      off();
      offDone();
      game.destroy();
      gameRef.current = null;
    };
  }, [onComplete]);

  // Rebuild only the picture when the theme or Focus mode changes.
  useEffect(() => {
    const bump = () => setThemeVersion((v) => v + 1);
    const observer = new MutationObserver(bump);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme", "data-focus"] });
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    mq.addEventListener("change", bump);
    return () => {
      observer.disconnect();
      mq.removeEventListener("change", bump);
    };
  }, []);

  // The container only exists once the game state has loaded, so wait for `ready`.
  const ready = snap !== null;
  useEffect(() => {
    const game = gameRef.current;
    const el = containerRef.current;
    if (!ready || !game || !el || textOnly) return;
    try {
      game.setTheme(readMapTheme());
      game.mount(el, {
        difficulty: 1,
        seed: 1,
        reducedMotion: prefersReducedMotion(),
        onComplete: () => {}, // the page already listens to the session
        onError: (message) => {
          setError(message);
          setTextOnly(true);
        },
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "The picture could not start.");
      setTextOnly(true);
    }
  }, [ready, textOnly, themeVersion]);

  // Switching to text only must stop the picture, not just hide it, so Phaser is not left running.
  useEffect(() => {
    if (textOnly) gameRef.current?.unmount();
  }, [textOnly]);

  if (!snap) return <p className="text-text-muted">Loading the game...</p>;

  const session = gameRef.current!.session;
  const { level, state } = snap;
  const running = state.status === "running";
  const ended = !running;
  const cleared = (id: LevelId) => (games[`gradient-hiker:level-${id}`]?.wins ?? 0) > 0;
  const is2D = level.landscape.dims === 2;

  return (
    <div className="space-y-5">
      <div role="group" aria-label="Choose a level" className="flex flex-wrap gap-2">
        {LEVEL_TITLES.map(({ id, title }) => (
          <button
            key={id}
            type="button"
            aria-pressed={level.id === id}
            onClick={() => {
              setLastResult(null);
              session.setLevel(id);
            }}
            className={`tap rounded-[var(--radius)] border-2 px-3 text-sm font-semibold ${
              level.id === id ? "border-primary bg-primary text-on-primary" : "border-border bg-surface text-text"
            }`}
          >
            {id}. {title}
            {cleared(id) && <span className="ml-1">(cleared)</span>}
          </button>
        ))}
      </div>

      <p className="max-w-prose text-lg">{level.goal}</p>

      {error && (
        <p role="alert" className="rounded-[var(--radius)] border-2 border-danger bg-surface p-3">
          The picture could not start in this browser ({error}). The game works the same in text form below.
        </p>
      )}

      {!textOnly && (
        <div
          ref={containerRef}
          aria-hidden="true"
          className="h-[360px] w-full overflow-hidden rounded-[var(--radius)] border-2 border-border bg-surface-2"
        />
      )}

      <label className="tap flex items-center gap-2 text-sm">
        <input type="checkbox" checked={textOnly} onChange={(e) => setTextOnly(e.target.checked)} className="h-4 w-4" />
        Text only (no picture): best for screen readers and slow devices
      </label>

      <fieldset className="rounded-[var(--radius)] border border-border bg-surface p-4">
        <legend className="px-1 font-display text-lg">Controls</legend>

        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label htmlFor="lr" className="font-semibold">
              Learning rate: <span className="font-mono">{snap.lr.toFixed(3)}</span>
            </label>
            <input
              id="lr"
              type="range"
              min={0}
              max={SLIDER_STEPS}
              step={5}
              value={sliderFromLr(snap.lr)}
              onChange={(e) => session.setLr(lrFromSlider(Number(e.target.value)))}
              aria-valuetext={`${snap.lr.toFixed(3)}`}
              aria-describedby="lr-help"
              className="min-h-11 w-full accent-[var(--c-primary)]"
            />
            <p id="lr-help" className="text-sm text-text-muted">
              Log scale, 0.005 to 2. Arrow keys nudge it.
              {snap.cap !== null && (
                <>
                  {" "}Stability limit: <strong className="font-mono text-text">{snap.cap.toFixed(3)}</strong>
                  {level.momentumAvailable ? " (rises with momentum)" : " (that is 2 divided by the steepest curvature)"}.
                </>
              )}
            </p>
          </div>

          {level.momentumAvailable && (
            <div>
              <label htmlFor="momentum" className="font-semibold">
                Momentum: <span className="font-mono">{snap.momentum.toFixed(2)}</span>
              </label>
              <input
                id="momentum"
                type="range"
                min={0}
                max={0.95}
                step={0.05}
                value={snap.momentum}
                onChange={(e) => session.setMomentum(Number(e.target.value))}
                className="min-h-11 w-full accent-[var(--c-primary)]"
              />
              <p className="text-sm text-text-muted">0 is plain gradient descent. Higher values carry speed from step to step.</p>
            </div>
          )}
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <button type="button" className={btn} onClick={() => session.step()} disabled={ended}>
            Step
          </button>
          <button type="button" className={btn} onClick={() => session.run()} disabled={ended}>
            Run
          </button>
          <button type="button" className={btn} onClick={() => { setLastResult(null); session.reset(); }}>
            Reset
          </button>
          {(level.id === 4 || level.id === 5) && (
            <button type="button" className={btn} onClick={() => { setLastResult(null); session.reseed(); }}>
              New landscape
            </button>
          )}
        </div>
      </fieldset>

      <div role="status" aria-live="polite" className="rounded-[var(--radius)] border border-border bg-surface p-4">
        <p className={`font-bold ${TONE[snap.feedback.tone]}`}>{snap.feedback.headline}</p>
        <p className="text-text-muted">{snap.feedback.detail}</p>
        <p className="mt-1 text-sm">
          Step {state.steps} of {level.budget}. Loss {state.losses.at(-1)!.toFixed(3)}.
          {state.status === "won" && ` Score ${Math.round(snap.score * 100)}%.`}
        </p>
        {lastResult && lastResult.won && <p className="mt-1 text-sm font-semibold text-success">Result saved to your progress.</p>}
      </div>

      <details open={textOnly} className="rounded-[var(--radius)] border border-border bg-surface p-4">
        <summary className="tap flex cursor-pointer items-center font-semibold">Table of every step</summary>
        <div className="mt-2 overflow-x-auto">
          <table className="w-full min-w-[20rem] text-left text-sm">
            <caption className="sr-only">Position and loss after each step</caption>
            <thead>
              <tr>
                <th scope="col" className="py-1 pr-4">Step</th>
                <th scope="col" className="py-1 pr-4">{is2D ? "x" : "Position"}</th>
                {is2D && <th scope="col" className="py-1 pr-4">y</th>}
                <th scope="col" className="py-1">Loss</th>
              </tr>
            </thead>
            <tbody>
              {state.trail.map((p, i) => (
                <tr key={i} className="border-t border-border">
                  <th scope="row" className="py-1 pr-4 font-normal">{i}</th>
                  <td className="py-1 pr-4 font-mono">{p[0]!.toFixed(3)}</td>
                  {is2D && <td className="py-1 pr-4 font-mono">{p[1]!.toFixed(3)}</td>}
                  <td className="py-1 font-mono">{state.losses[i]!.toFixed(3)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </div>
  );
}
