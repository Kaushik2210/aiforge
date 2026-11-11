import { PyRunner } from "@aiforge/runner";
import { withBase } from "@/lib/base-path";

let runner: PyRunner | null = null;

/** One shared Python worker for the whole page; created on first use. */
export function getRunner(): PyRunner {
  runner ??= new PyRunner({
    workerUrl: withBase("/runner/pyodide-worker.mjs"),
    pyodideBase: withBase("/pyodide/"),
    timeoutMs: 10_000,
  });
  return runner;
}
