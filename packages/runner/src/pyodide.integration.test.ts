import fs from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { beforeAll, describe, expect, it } from "vitest";
import { loadPyodide, type PyodideInterface } from "pyodide";
import { HARNESS_PY } from "./harness";
import { parseHarnessOutput } from "./parse";

const contentRoot = path.resolve(__dirname, "../../../content");

function findChallenges(dir: string, out: string[] = []): string[] {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, e.name);
    if (!e.isDirectory()) continue;
    if (fs.existsSync(path.join(full, "tests.py"))) out.push(full);
    else findChallenges(full, out);
  }
  return out;
}

let py: PyodideInterface;
let run: (code: string, tests: string) => ReturnType<typeof parseHarnessOutput>;

beforeAll(async () => {
  // Point at the installed files explicitly; auto-detection breaks under Vite's transform.
  const indexURL = path.dirname(createRequire(import.meta.url).resolve("pyodide/package.json")) + path.sep;
  py = await loadPyodide({ indexURL });
  py.runPython(HARNESS_PY);
  const fn = py.globals.get("run_submission");
  run = (code, tests) => parseHarnessOutput(fn(code, tests) as string);
}, 120_000);

const read = (dir: string, f: string) => fs.readFileSync(path.join(dir, f), "utf8");

describe("browser harness matches challenge CI (real Pyodide)", () => {
  for (const dir of findChallenges(contentRoot)) {
    const name = path.basename(dir);
    it(`${name}: starter fails`, () => {
      const r = run(read(dir, "starter.py"), read(dir, "tests.py"));
      expect(r.passed).toBe(false);
      expect(r.tests.length).toBeGreaterThan(0);
    });
    it(`${name}: solution passes every test`, () => {
      const r = run(read(dir, "solution.py"), read(dir, "tests.py"));
      expect(r.tests.filter((t) => !t.passed)).toEqual([]);
      expect(r.passed).toBe(true);
    });
  }
});

describe("harness edge cases", () => {
  const dir = path.join(contentRoot, "02-math-ml-foundations/gradient-descent/challenges/gd-loop");
  const tests = read(dir, "tests.py");

  it("reports a syntax error as a readable message", () => {
    const r = run("def gradient_descent(:\n", tests);
    expect(r.passed).toBe(false);
    expect(r.error).toMatch(/SyntaxError/);
  });

  it("reports a wrong answer per test, not a crash", () => {
    const r = run("def gradient_descent(grad, x0, lr, steps):\n    return [x0]\n", tests);
    expect(r.passed).toBe(false);
    expect(r.tests.some((t) => !t.passed && t.message)).toBe(true);
  });

  it("does not leak state between runs", () => {
    const good = read(dir, "solution.py");
    expect(run(good, tests).passed).toBe(true);
    expect(run("def gradient_descent(grad, x0, lr, steps):\n    return []\n", tests).passed).toBe(false);
    expect(run(good, tests).passed).toBe(true);
  });
});
