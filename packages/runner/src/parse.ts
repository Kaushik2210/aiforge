export interface TestResult {
  name: string;
  passed: boolean;
  message?: string;
}

export interface RunResult {
  /** True only when at least one test ran and every test passed. */
  passed: boolean;
  tests: TestResult[];
  /** Set when the code failed before any test could report (syntax error, import error...). */
  error?: string;
  /** Set when the run was killed for taking too long. */
  timedOut?: boolean;
  raw: string;
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

/** Turn the harness JSON ({status, output}) into a friendly result. */
export function parseHarnessOutput(json: string): RunResult {
  const { status, output } = JSON.parse(json) as { status: number; output: string };
  const tests: TestResult[] = [];
  for (const line of output.split(/\r?\n/)) {
    const pass = /^PASS (\S+)/.exec(line);
    const fail = /^FAIL (\S+?)(?::\s*(.*))?$/.exec(line);
    if (pass) tests.push({ name: prettyName(pass[1]!), passed: true });
    else if (fail) tests.push({ name: prettyName(fail[1]!), passed: false, message: fail[2] || undefined });
  }
  const passed = tests.length > 0 && tests.every((t) => t.passed) && status === 0;
  const result: RunResult = { passed, tests, raw: output };
  if (tests.length === 0 && status !== 0) result.error = lastErrorLine(output);
  return result;
}
