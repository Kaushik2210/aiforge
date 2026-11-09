/**
 * Python harness executed inside Pyodide. It writes the learner's code and the
 * challenge's tests.py to a scratch folder, runs tests.py exactly as the
 * command-line challenge CI does (SUBMISSION env var), and returns JSON.
 *
 * Keeping one harness means "passes in CI" and "passes in the browser" are the
 * same claim.
 */
export const HARNESS_PY = `
import io, json, os, runpy, sys, traceback

def run_submission(submission_code, tests_code):
    root = "/tmp/aiforge_run"
    os.makedirs(root, exist_ok=True)
    sub_path = os.path.join(root, "submission.py")
    tests_path = os.path.join(root, "tests.py")
    with open(sub_path, "w") as f:
        f.write(submission_code)
    with open(tests_path, "w") as f:
        f.write(tests_code)

    os.environ["SUBMISSION"] = sub_path
    buf = io.StringIO()
    old_out, old_err, old_argv = sys.stdout, sys.stderr, sys.argv
    sys.stdout = sys.stderr = buf
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
        sys.stdout, sys.stderr, sys.argv = old_out, old_err, old_argv
    return json.dumps({"status": status, "output": buf.getvalue()})
`;
