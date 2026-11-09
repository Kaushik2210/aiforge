export interface TestResult {
  name: string;
  passed: boolean;
  message?: string;
}

export interface HiddenSummary {
  passed: number;
  total: number;
}

export interface RunResult {
  /** True only when every visible test (and every hidden check) passed. */
  passed: boolean;
  tests: TestResult[];
  /** Hidden checks report counts only: no names, no messages. */
  hidden?: HiddenSummary;
  /** Set when the code failed before any test could report (syntax error, import error...). */
  error?: string;
  /** Set when the run was killed for taking too long or was cancelled. */
  timedOut?: boolean;
  cancelled?: boolean;
  /** The learner's own print output, capped. */
  output: string;
  outputTruncated: boolean;
}

export interface FileRun {
  status: number;
  tests: string[];
  output: string;
  tail: string;
  truncated: boolean;
}

/** "test_first_step" -> "first step" */
export function prettyName(name: string): string {
  return name.replace(/^test_/, "").replace(/_/g, " ");
}

/** Last non-empty line of a Python traceback is the most useful one. */
export function lastErrorLine(raw: string): string {
  const lines = raw.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  return lines.at(-1) ?? "The program stopped with an unknown error.";
}

function parseLines(lines: string[]): TestResult[] {
  const tests: TestResult[] = [];
  for (const line of lines) {
    const pass = /^PASS (\S+)/.exec(line);
    const fail = /^FAIL (\S+?)(?::\s*(.*))?$/.exec(line);
    if (pass) tests.push({ name: prettyName(pass[1]!), passed: true });
    else if (fail) tests.push({ name: prettyName(fail[1]!), passed: false, message: fail[2] || undefined });
  }
  return tests;
}

/** An empty or crashed file run counts as a failed hidden check, never a pass. */
function hiddenSummary(run: FileRun): HiddenSummary {
  const tests = parseLines(run.tests);
  if (tests.length === 0) return { passed: 0, total: 1 };
  return { passed: tests.filter((t) => t.passed).length, total: tests.length };
}

/** Turn the harness JSON into a friendly result. */
export function parseHarnessOutput(json: string): RunResult {
  const { visible, hidden } = JSON.parse(json) as { visible: FileRun; hidden: FileRun | null };
  const tests = parseLines(visible.tests);
  const hiddenResult = hidden ? hiddenSummary(hidden) : undefined;

  const visibleOk = tests.length > 0 && tests.every((t) => t.passed) && visible.status === 0;
  const hiddenOk = !hiddenResult || (hiddenResult.passed === hiddenResult.total && hidden!.status === 0);

  const result: RunResult = {
    passed: visibleOk && hiddenOk,
    tests,
    output: visible.output,
    outputTruncated: visible.truncated,
  };
  if (hiddenResult) result.hidden = hiddenResult;
  if (tests.length === 0 && visible.status !== 0) result.error = lastErrorLine(visible.tail);
  return result;
}
