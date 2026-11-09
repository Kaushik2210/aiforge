import { describe, expect, it } from "vitest";
import { lastErrorLine, parseHarnessOutput, prettyName, type FileRun } from "./parse";

const file = (over: Partial<FileRun> = {}): FileRun => ({
  status: 0,
  tests: [],
  output: "",
  tail: "",
  truncated: false,
  ...over,
});
const wrap = (visible: Partial<FileRun>, hidden?: Partial<FileRun>) =>
  JSON.stringify({ visible: file(visible), hidden: hidden ? file(hidden) : null });

describe("parseHarnessOutput: visible tests", () => {
  it("reads passing and failing tests", () => {
    const r = parseHarnessOutput(
      wrap({ status: 1, tests: ["PASS test_first_step", "FAIL test_converges: expected 0.06 got 3.4"] }),
    );
    expect(r.passed).toBe(false);
    expect(r.tests).toEqual([
      { name: "first step", passed: true },
      { name: "converges", passed: false, message: "expected 0.06 got 3.4" },
    ]);
  });

  it("is passed only when every test passes and exit status is 0", () => {
    expect(parseHarnessOutput(wrap({ tests: ["PASS test_a", "PASS test_b"] })).passed).toBe(true);
    expect(parseHarnessOutput(wrap({ status: 1, tests: ["PASS test_a"] })).passed).toBe(false);
  });

  it("does not count zero tests as a pass", () => {
    expect(parseHarnessOutput(wrap({})).passed).toBe(false);
  });

  it("surfaces the last traceback line when no test reported", () => {
    const r = parseHarnessOutput(
      wrap({ status: 1, tail: 'Traceback (most recent call last):\n  File "x", line 1\nSyntaxError: invalid syntax' }),
    );
    expect(r.tests).toEqual([]);
    expect(r.error).toBe("SyntaxError: invalid syntax");
  });

  it("keeps the learner's print output separate from tests", () => {
    const r = parseHarnessOutput(wrap({ output: "debug: x = 5", tests: ["PASS test_a"] }));
    expect(r.output).toBe("debug: x = 5");
    expect(r.tests).toHaveLength(1);
  });

  it("reports truncated output", () => {
    expect(parseHarnessOutput(wrap({ tests: ["PASS test_a"], truncated: true })).outputTruncated).toBe(true);
  });

  it("handles a failing test with no message", () => {
    expect(parseHarnessOutput(wrap({ status: 1, tests: ["FAIL test_x"] })).tests[0]).toEqual({
      name: "x",
      passed: false,
      message: undefined,
    });
  });
});

describe("parseHarnessOutput: hidden checks", () => {
  const visibleOk = { tests: ["PASS test_a"] };

  it("reports counts only, never names or messages", () => {
    const r = parseHarnessOutput(
      wrap(visibleOk, { status: 1, tests: ["PASS test_secret_one", "FAIL test_secret_two: leaked detail"] }),
    );
    expect(r.hidden).toEqual({ passed: 1, total: 2 });
    expect(JSON.stringify(r)).not.toMatch(/secret|leaked/);
  });

  it("requires hidden checks to pass for an overall pass", () => {
    expect(parseHarnessOutput(wrap(visibleOk, { tests: ["PASS test_h"] })).passed).toBe(true);
    expect(parseHarnessOutput(wrap(visibleOk, { status: 1, tests: ["FAIL test_h"] })).passed).toBe(false);
  });

  it("treats a crashed hidden file as a failure, not a pass", () => {
    const r = parseHarnessOutput(wrap(visibleOk, { status: 1, tests: [] }));
    expect(r.passed).toBe(false);
    expect(r.hidden).toEqual({ passed: 0, total: 1 });
  });

  it("has no hidden summary when there are no hidden checks", () => {
    expect(parseHarnessOutput(wrap(visibleOk)).hidden).toBeUndefined();
  });
});

describe("helpers", () => {
  it("prettyName", () => expect(prettyName("test_large_rate_diverges")).toBe("large rate diverges"));
  it("lastErrorLine falls back", () => expect(lastErrorLine("")).toMatch(/unknown/));
});
