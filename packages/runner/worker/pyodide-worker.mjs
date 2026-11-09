// Module Web Worker: loads Pyodide once, then runs the harness for each request.
// Served from /runner/pyodide-worker.mjs (copied there by scripts/sync-runner-assets.mjs).
// User code only ever runs in here, never on the page's main thread.

let runSubmission = null;

self.onmessage = async (event) => {
  const msg = event.data;

  if (msg.type === "init") {
    try {
      const { loadPyodide } = await import(`${msg.pyodideBase}pyodide.mjs`);
      const pyodide = await loadPyodide({ indexURL: msg.pyodideBase });
      pyodide.runPython(msg.harness);
      runSubmission = pyodide.globals.get("run_submission");
      self.postMessage({ type: "ready" });
    } catch (err) {
      self.postMessage({ type: "init-error", message: `Could not start Python: ${String(err)}` });
    }
    return;
  }

  if (msg.type === "run") {
    try {
      const json = runSubmission(msg.code, msg.tests, msg.hidden ?? undefined);
      self.postMessage({ type: "result", id: msg.id, json });
    } catch (err) {
      self.postMessage({ type: "error", id: msg.id, message: String(err) });
    }
  }
};
