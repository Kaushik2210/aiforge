"use client";

import {
  HikerSession,
  LEVEL_IDS,
  SLIDER_STEPS,
  getLevel,
  lrFromSlider,
  renderAscii,
  sliderFromLr,
  type HikerResult,
  type HikerSnapshot,
  type LevelId,
} from "@aiforge/games";
import { useCallback, useEffect, useRef, useState } from "react";
import { useProgress } from "@/lib/progress-store";

const WALK_MS = 350;
const LEVEL_TITLES = LEVEL_IDS.map((id) => ({ id, title: getLevel(id).title }));
const btn = "tap rounded-[var(--radius)] border-2 border-border bg-surface px-4 font-mono font-semibold text-text disabled:opacity-50";
const TONE: Record<string, string> = { good: "text-success", warn: "text-text", bad: "text-danger", info: "text-text" };

/**
 * Loss Mountains: Gradient Hiker drawn with characters. It uses the same rules and session as the
 * picture version (so a win counts the same), with no canvas: the board is text. The board is a
 * decoration; the status line, the legend and the table of steps say the same things in words.
 */
export function LossMountains() {
  const sessionRef = useRef<HikerSession | null>(null);
  const [snap, setSnap] = useState<HikerSnapshot | null>(null);
  const [walking, setWalking] = useState(false);
  const [saved, setSaved] = useState(false);
  const dispatch = useProgress((s) => s.dispatch);
  const games = useProgress((s) => s.snapshot.games);
  const timer = useRef<number | undefined>(undefined);

  const stopWalk = useCallback(() => {
    window.clearInterval(timer.current);
    timer.current = undefined;
    setWalking(false);
  }, []);

  useEffect(() => {
    const session = new HikerSession({ levelId: 1, seed: "loss-mountains-v1" });
    sessionRef.current = session;
    setSnap(session.snapshot);
    const off = session.events.on("change", (s) => {
      setSnap(s);
      if (s.state.status !== "running") stopWalk();
    });
    const offDone = session.events.on("complete", (r: HikerResult) => {
      setSaved(r.won);
      void dispatch({ type: "game-result", id: `loss-mountains:level-${r.levelId}`, won: r.won });
    });
    return () => {
      off();
      offDone();
      window.clearInterval(timer.current);
      sessionRef.current = null;
    };
  }, [dispatch, stopWalk]);

  if (!snap || !sessionRef.current) return <p className="font-mono text-text-muted">Loading the mountains...</p>;
  const session = sessionRef.current;
  const { level, state } = snap;
  const view = renderAscii(level, state);
  const running = state.status === "running";
  const is2D = level.landscape.dims === 2;
  const cleared = (id: LevelId) => (games[`loss-mountains:level-${id}`]?.wins ?? 0) > 0;

  const walk = () => {
    if (!running || walking) return;
    setWalking(true);
    timer.current = window.setInterval(() => session.step(), WALK_MS);
  };

  return (
    <div className="space-y-5">
      <div role="group" aria-label="Choose a level" className="flex flex-wrap gap-2">
        {LEVEL_TITLES.map(({ id, title }) => (
          <button
            key={id}
            type="button"
            aria-pressed={level.id === id}
            onClick={() => {
              stopWalk();
              setSaved(false);
              session.setLevel(id);
            }}
            className={`tap rounded-[var(--radius)] border-2 px-3 font-mono text-sm font-semibold ${
              level.id === id ? "border-primary bg-primary text-on-primary" : "border-border bg-surface text-text"
            }`}
          >
            {id}. {title}
            {cleared(id) && <span className="ml-1">(cleared)</span>}
          </button>
        ))}
      </div>

      <p className="max-w-prose text-lg">{level.goal}</p>

      <figure className="overflow-hidden rounded-[var(--radius)] border-2 border-border bg-surface p-4">
        <pre aria-hidden="true" className="ascii-board select-none overflow-hidden whitespace-pre font-mono text-accent">
          {view.rows.join("\n")}
        </pre>
        <figcaption className="mt-3 space-y-1 font-mono text-xs text-text-muted">
          {view.legend.map((line) => (
            <p key={line} className="break-words">{line}</p>
          ))}
        </figcaption>
      </figure>

      <fieldset className="rounded-[var(--radius)] border border-border bg-surface p-4">
        <legend className="px-1 font-mono text-lg">Controls</legend>
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label htmlFor="lm-lr" className="font-semibold">
              Learning rate: <span className="font-mono">{snap.lr.toFixed(3)}</span>
            </label>
            <input
              id="lm-lr"
              type="range"
              min={0}
              max={SLIDER_STEPS}
              step={5}
              value={sliderFromLr(snap.lr)}
              onChange={(e) => session.setLr(lrFromSlider(Number(e.target.value)))}
              aria-valuetext={snap.lr.toFixed(3)}
              className="min-h-11 w-full accent-[var(--c-primary)]"
            />
            <p className="text-sm text-text-muted">
              Log scale, 0.005 to 2.
              {snap.cap !== null && (
                <>
                  {" "}Stability limit: <strong className="font-mono text-text">{snap.cap.toFixed(3)}</strong>.
                </>
              )}
            </p>
          </div>
          {level.momentumAvailable && (
            <div>
              <label htmlFor="lm-mom" className="font-semibold">
                Momentum: <span className="font-mono">{snap.momentum.toFixed(2)}</span>
              </label>
              <input
                id="lm-mom"
                type="range"
                min={0}
                max={0.95}
                step={0.05}
                value={snap.momentum}
                onChange={(e) => session.setMomentum(Number(e.target.value))}
                className="min-h-11 w-full accent-[var(--c-primary)]"
              />
            </div>
          )}
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <button type="button" className={btn} onClick={() => session.step()} disabled={!running || walking}>Step</button>
          {walking ? (
            <button type="button" className={btn} onClick={stopWalk}>Stop walking</button>
          ) : (
            <button type="button" className={btn} onClick={walk} disabled={!running}>Walk</button>
          )}
          <button type="button" className={btn} onClick={() => session.run()} disabled={!running || walking}>Run to the end</button>
          <button type="button" className={btn} onClick={() => { stopWalk(); setSaved(false); session.reset(); }}>Reset</button>
          {(level.id === 4 || level.id === 5) && (
            <button type="button" className={btn} onClick={() => { stopWalk(); setSaved(false); session.reseed(); }}>New landscape</button>
          )}
        </div>
      </fieldset>

      <div role="status" aria-live="polite" className="rounded-[var(--radius)] border border-border bg-surface p-4">
        <p className={`font-bold ${TONE[snap.feedback.tone]}`}>{snap.feedback.headline}</p>
        <p className="text-text-muted">{snap.feedback.detail}</p>
        <p className="mt-1 text-sm">{view.description}</p>
        {saved && <p className="mt-1 text-sm font-semibold text-success">Result saved to your progress.</p>}
      </div>

      <details className="rounded-[var(--radius)] border border-border bg-surface p-4">
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
