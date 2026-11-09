/**
 * Python harness executed inside Pyodide. It writes the learner's code and the
 * challenge's tests to a scratch folder and runs them exactly as the
 * command-line challenge CI does (SUBMISSION env var), returning JSON.
 *
 * Keeping one harness means "passes in CI" and "passes in the browser" are the
 * same claim.
 *
 * Guard rails:
 * - Output is capped: a print loop cannot balloon memory. PASS/FAIL lines from
 *   the tests are always kept, plus the tail (where a traceback ends).
 * - stdin is empty, so input() raises EOFError instead of hanging.
 * - Hidden checks (hidden_tests.py) run separately; only counts are reported.
 */
export const HARNESS_PY = `
import io, json, os, runpy, sys, traceback

HEAD_LIMIT = 8000
TAIL_LINES = 30
MAX_TEST_LINES = 200

class Capture(io.TextIOBase):
    def __init__(self):
        self.partial = ""
        self.head = []
        self.head_size = 0
        self.tests = []
        self.tail = []
        self.truncated = False

    def writable(self):
        return True

    def write(self, s):
        n = len(s)
        self.partial += s
        while "\\n" in self.partial:
            line, self.partial = self.partial.split("\\n", 1)
            self._line(line)
        if len(self.partial) > 2000:
            self._line(self.partial[:2000])
            self.partial = ""
        return n

    def _line(self, line):
        if (line.startswith("PASS ") or line.startswith("FAIL ")) and len(self.tests) < MAX_TEST_LINES:
            self.tests.append(line[:500])
            return
        self.tail.append(line[:500])
        if len(self.tail) > TAIL_LINES:
            self.tail.pop(0)
        if self.head_size < HEAD_LIMIT:
            self.head.append(line[:500])
            self.head_size += len(line) + 1
        else:
            self.truncated = True

    def finish(self):
        if self.partial:
            self._line(self.partial)
            self.partial = ""
        return {
            "tests": self.tests,
            "output": "\\n".join(self.head),
            "tail": "\\n".join(self.tail),
            "truncated": self.truncated,
        }

def run_file(tests_path, sub_path):
    os.environ["SUBMISSION"] = sub_path
    cap = Capture()
    old = sys.stdout, sys.stderr, sys.stdin, sys.argv
    sys.stdout = sys.stderr = cap
    sys.stdin = io.StringIO("")
    sys.argv = [tests_path, sub_path]
    status = 0
    try:
        runpy.run_path(tests_path, run_name="__main__")
    except SystemExit as e:
        status = e.code if isinstance(e.code, int) else (0 if e.code is None else 1)
    except BaseException:
        traceback.print_exc()
        status = 1
    finally:
        sys.stdout, sys.stderr, sys.stdin, sys.argv = old
    result = cap.finish()
    result["status"] = status
    return result

def run_submission(submission_code, tests_code, hidden_code=None):
    root = "/tmp/aiforge_run"
    os.makedirs(root, exist_ok=True)
    sub_path = os.path.join(root, "submission.py")
    tests_path = os.path.join(root, "tests.py")
    hidden_path = os.path.join(root, "hidden_tests.py")
    with open(sub_path, "w") as f:
        f.write(submission_code)
    with open(tests_path, "w") as f:
        f.write(tests_code)
    visible = run_file(tests_path, sub_path)
    hidden = None
    if hidden_code:
        with open(hidden_path, "w") as f:
            f.write(hidden_code)
        hidden = run_file(hidden_path, sub_path)
    return json.dumps({"visible": visible, "hidden": hidden})
`;
