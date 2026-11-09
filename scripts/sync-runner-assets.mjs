// Copies the Pyodide runtime and the runner worker into apps/web/public so the
// static site serves them itself (works offline, no CDN). Run before dev/build.
import fs from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const require = createRequire(path.join(root, "packages/runner/package.json"));
const pyodideDir = path.dirname(require.resolve("pyodide/package.json"));
const pub = path.join(root, "apps/web/public");

const PYODIDE_FILES = ["pyodide.mjs", "pyodide.asm.mjs", "pyodide.asm.wasm", "python_stdlib.zip", "pyodide-lock.json"];

fs.mkdirSync(path.join(pub, "pyodide"), { recursive: true });
fs.mkdirSync(path.join(pub, "runner"), { recursive: true });

for (const f of PYODIDE_FILES) {
  fs.copyFileSync(path.join(pyodideDir, f), path.join(pub, "pyodide", f));
}
fs.copyFileSync(
  path.join(root, "packages/runner/worker/pyodide-worker.mjs"),
  path.join(pub, "runner/pyodide-worker.mjs"),
);
console.log(`runner assets synced (${PYODIDE_FILES.length} Pyodide files + worker)`);
