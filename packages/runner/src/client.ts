import { HARNESS_PY } from "./harness";
import { parseHarnessOutput, type RunResult } from "./parse";

export interface PyRunnerOptions {
  /** URL of the module worker script (served from /runner/pyodide-worker.mjs). */
  workerUrl: string;
  /** Folder URL (with trailing slash) holding pyodide.mjs, the wasm and the stdlib. */
  pyodideBase: string;
  /** Kill a run that takes longer than this. */
  timeoutMs?: number;
}

type WorkerMessage =
  | { type: "ready" }
  | { type: "result"; id: number; json: string }
  | { type: "error"; id: number; message: string }
  | { type: "init-error"; message: string };

/**
 * Runs learner Python in a Web Worker so the page never freezes. If a run
 * exceeds the timeout, the worker is terminated and a fresh one is started on
 * the next run: an infinite loop can never hang the UI.
 */
export class PyRunner {
  private worker: Worker | null = null;
  private ready: Promise<void> | null = null;
  private nextId = 1;
  private readonly timeoutMs: number;

  constructor(private readonly opts: PyRunnerOptions) {
    this.timeoutMs = opts.timeoutMs ?? 10_000;
  }

  /** Start loading Pyodide in the background (idempotent). */
  warmUp(): Promise<void> {
    if (this.ready) return this.ready;
    const worker = new Worker(this.opts.workerUrl, { type: "module" });
    this.worker = worker;
    this.ready = new Promise<void>((resolve, reject) => {
      const onMessage = (e: MessageEvent<WorkerMessage>) => {
        if (e.data.type === "ready") {
          worker.removeEventListener("message", onMessage);
          resolve();
        } else if (e.data.type === "init-error") {
          worker.removeEventListener("message", onMessage);
          this.dispose();
          reject(new Error(e.data.message));
        }
      };
      worker.addEventListener("message", onMessage);
      worker.addEventListener("error", (e) => {
        this.dispose();
        reject(new Error(e.message || "The Python worker failed to start."));
      });
      worker.postMessage({ type: "init", pyodideBase: this.opts.pyodideBase, harness: HARNESS_PY });
    });
    return this.ready;
  }

  async run(code: string, tests: string): Promise<RunResult> {
    await this.warmUp();
    const worker = this.worker;
    if (!worker) throw new Error("The Python worker is not available.");
    const id = this.nextId++;

    return new Promise<RunResult>((resolve) => {
      const finish = (r: RunResult) => {
        clearTimeout(timer);
        worker.removeEventListener("message", onMessage);
        resolve(r);
      };
      const timer = setTimeout(() => {
        this.dispose(); // hard kill: the only way to stop a tight infinite loop
        finish({
          passed: false,
          tests: [],
          timedOut: true,
          error: `Your code ran longer than ${this.timeoutMs / 1000} seconds and was stopped. Check for an infinite loop.`,
          raw: "",
        });
      }, this.timeoutMs);

      const onMessage = (e: MessageEvent<WorkerMessage>) => {
        const m = e.data;
        if (m.type === "result" && m.id === id) finish(parseHarnessOutput(m.json));
        else if (m.type === "error" && m.id === id) {
          finish({ passed: false, tests: [], error: m.message, raw: m.message });
        }
      };
      worker.addEventListener("message", onMessage);
      worker.postMessage({ type: "run", id, code, tests });
    });
  }

  dispose(): void {
    this.worker?.terminate();
    this.worker = null;
    this.ready = null;
  }
}
