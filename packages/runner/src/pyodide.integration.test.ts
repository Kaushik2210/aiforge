import fs from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { beforeAll, describe, expect, it } from "vitest";
import { loadPyodide, type PyodideInterface } from "pyodide";
import { HARNESS_PY } from "./harness";
import { parseHarnessOutput, type RunResult } from "./parse";

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

let run: (code: string, tests: string, hidden?: string) => RunResult;

beforeAll(async () => {
  // Point at the installed files explicitly; auto-detection breaks under Vite's transform.
  const indexURL = path.dirname(createRequire(import.meta.url).resolve("pyodide/package.json")) + path.sep;
  const py: PyodideInterface = await loadPyodide({ indexURL });
  py.runPython(HARNESS_PY);
  const fn = py.globals.get("run_submission");
  run = (code, tests, hidden) => parseHarnessOutput(fn(code, tests, hidden ?? null) as string);
}, 120_000);

const read = (dir: string, f: string) => fs.readFileSync(path.join(dir, f), "utf8");
const readOpt = (dir: string, f: string) => (fs.existsSync(path.join(dir, f)) ? read(dir, f) : undefined);

describe("browser harness matches challenge CI (real Pyodide)", () => {
  for (const dir of findChallenges(contentRoot)) {
    const name = path.basename(dir);
    const tests = read(dir, "tests.py");
    const hidden = readOpt(dir, "hidden_tests.py");

    it(`${name}: starter fails`, () => {
      const r = run(read(dir, "starter.py"), tests, hidden);
      expect(r.passed).toBe(false);
      expect(r.tests.length).toBeGreaterThan(0);
    });

    it(`${name}: solution passes visible tests and hidden checks`, () => {
      const r = run(read(dir, "solution.py"), tests, hidden);
      expect(r.tests.filter((t) => !t.passed)).toEqual([]);
      if (hidden) expect(r.hidden).toMatchObject({ passed: r.hidden!.total });
      expect(r.passed).toBe(true);
    });

    const mutantDir = path.join(dir, "mutants");
    const mutants = fs.existsSync(mutantDir) ? fs.readdirSync(mutantDir).filter((f) => f.endsWith(".py")) : [];
    for (const m of mutants) {
      it(`${name}: mutant ${m} is rejected`, () => {
        expect(run(read(mutantDir, m), tests, hidden).passed).toBe(false);
      });
    }
  }
});

describe("harness edge cases", () => {
  const dir = path.join(contentRoot, "02-math-ml-foundations/gradient-descent/challenges/gd-loop");
  const tests = read(dir, "tests.py");
  const good = read(dir, "solution.py");

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
    expect(run(good, tests).passed).toBe(true);
    expect(run("def gradient_descent(grad, x0, lr, steps):\n    return []\n", tests).passed).toBe(false);
    expect(run(good, tests).passed).toBe(true);
  });

  it("caps runaway print output and keeps the test results", () => {
    const noisy = 'for i in range(200000):\n    print("spam " * 20)\n' + good;
    const r = run(noisy, tests);
    expect(r.outputTruncated).toBe(true);
    expect(r.output.length).toBeLessThan(12_000);
    expect(r.passed).toBe(true); // PASS lines survive the flood
  });

  it("still shows the error line when output is flooded before a crash", () => {
    const code = 'for i in range(50000):\n    print("spam")\nraise ValueError("boom at the end")\n';
    const r = run(code, tests);
    expect(r.passed).toBe(false);
    expect(r.error).toContain("boom at the end");
  });

  it("makes input() fail fast instead of hanging", () => {
    const code = 'x = input("name? ")\n' + good;
    const r = run(code, tests);
    expect(r.passed).toBe(false);
    expect(r.error).toMatch(/EOFError/);
  });

  it("hides hidden check names and messages from the result", () => {
    const hiddenTests =
      'import sys\nprint("FAIL test_top_secret_name: secret detail")\nsys.exit(1)\n';
    const r = run(good, tests, hiddenTests);
    expect(r.passed).toBe(false);
    expect(r.hidden).toEqual({ passed: 0, total: 1 });
    expect(JSON.stringify(r)).not.toMatch(/top_secret|secret detail/);
  });

  it("counts a hidden file that crashes as a failure", () => {
    const r = run(good, tests, "raise RuntimeError('hidden crashed')\n");
    expect(r.passed).toBe(false);
    expect(r.hidden?.passed).toBe(0);
  });
});
