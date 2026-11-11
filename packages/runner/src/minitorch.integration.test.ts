import fs from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { beforeAll, describe, expect, it } from "vitest";
import { loadPyodide, type PyodideInterface } from "pyodide";

const pkgRoot = path.resolve(__dirname, "../../minitorch");
let py: PyodideInterface;

beforeAll(async () => {
  const indexURL = path.dirname(createRequire(import.meta.url).resolve("pyodide/package.json")) + path.sep;
  py = await loadPyodide({ indexURL });
  // Copy the library and its tests into Pyodide's in-memory file system.
  for (const dir of ["minitorch", "tests"]) {
    py.FS.mkdirTree(`/work/${dir}`);
    for (const f of fs.readdirSync(path.join(pkgRoot, dir))) {
      if (f.endsWith(".py")) py.FS.writeFile(`/work/${dir}/${f}`, fs.readFileSync(path.join(pkgRoot, dir, f), "utf8"));
    }
  }
}, 120_000);

describe("minitorch in the browser runtime (real Pyodide, no NumPy)", () => {
  it("passes its own unit tests", () => {
    const out = py.runPython(`
import io, sys, unittest
sys.path.insert(0, "/work")
sys.path.insert(0, "/work/tests")
buf = io.StringIO()
suite = unittest.defaultTestLoader.discover("/work/tests")
result = unittest.TextTestRunner(stream=buf, verbosity=0).run(suite)
f"{result.testsRun}|{len(result.failures)}|{len(result.errors)}|{len(result.skipped)}|" + buf.getvalue()[-400:]
`) as string;
    const [run, failures, errors] = out.split("|");
    expect({ failures: Number(failures), errors: Number(errors) }, out).toEqual({ failures: 0, errors: 0 });
    expect(Number(run)).toBeGreaterThan(30);
  }, 120_000);

  it("trains a tiny network end to end", () => {
    const loss = py.runPython(`
import sys
sys.path.insert(0, "/work")
import minitorch as mt
from minitorch import nn, optim
xs = mt.tensor([[0.0, 0.0], [0.0, 1.0], [1.0, 0.0], [1.0, 1.0]])
ys = mt.tensor([[0.0], [1.0], [1.0], [0.0]])
m = nn.Sequential(nn.Linear(2, 8, seed=1), nn.Tanh(), nn.Linear(8, 1, seed=2))
o = optim.SGD(m.parameters(), lr=0.3, momentum=0.8)
for _ in range(500):
    o.zero_grad(); nn.mse_loss(m(xs), ys).backward(); o.step()
nn.mse_loss(m(xs), ys).item()
`) as number;
    expect(loss).toBeLessThan(0.02);
  });
});
