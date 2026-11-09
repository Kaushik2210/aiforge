import { describe, expect, it } from "vitest";
import { lastErrorLine, parseHarnessOutput, prettyName } from "./parse";

const wrap = (status: number, output: string) => JSON.stringify({ status, output });

describe("parseHarnessOutput", () => {
  it("reads passing and failing tests", () => {
    const r = parseHarnessOutput(
      wrap(1, "PASS test_first_step\nFAIL test_converges: expected 0.06 got 3.4\n"),
    );
    expect(r.passed).toBe(false);
    expect(r.tests).toEqual([
      { name: "first step", passed: true },
      { name: "converges", passed: false, message: "expected 0.06 got 3.4" },
    ]);
  });

  it("is passed only when every test passes and exit status is 0", () => {
    expect(parseHarnessOutput(wrap(0, "PASS test_a\nPASS test_b\n")).passed).toBe(true);
    expect(parseHarnessOutput(wrap(1, "PASS test_a\n")).passed).toBe(false);
  });

  it("does not count zero tests as a pass", () => {
    expect(parseHarnessOutput(wrap(0, "")).passed).toBe(false);
  });

  it("surfaces a syntax error when no test reported", () => {
    const tb = 'Traceback (most recent call last):\n  File "x", line 1\n    def f(:\n          ^\nSyntaxError: invalid syntax\n';
    const r = parseHarnessOutput(wrap(1, tb));
    expect(r.tests).toEqual([]);
    expect(r.error).toBe("SyntaxError: invalid syntax");
  });

  it("ignores the learner's own print output", () => {
    const r = parseHarnessOutput(wrap(0, "debug: x = 5\nPASS test_a\n"));
    expect(r.tests).toHaveLength(1);
    expect(r.passed).toBe(true);
  });

  it("handles a failing test with no message", () => {
    expect(parseHarnessOutput(wrap(1, "FAIL test_x\n")).tests[0]).toEqual({
      name: "x",
      passed: false,
      message: undefined,
    });
  });
});

describe("helpers", () => {
  it("prettyName", () => expect(prettyName("test_large_rate_diverges")).toBe("large rate diverges"));
  it("lastErrorLine falls back", () => expect(lastErrorLine("")).toMatch(/unknown/));
});
