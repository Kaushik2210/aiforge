import { PyRunner } from "@aiforge/runner";

let runner: PyRunner | null = null;

/** One shared Python worker for the whole page; created on first use. */
export function getRunner(): PyRunner {
  runner ??= new PyRunner({
    workerUrl: "/runner/pyodide-worker.mjs",
    pyodideBase: "/pyodide/",
    timeoutMs: 10_000,
  });
  return runner;
}
