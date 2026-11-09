// Challenge CI. For every challenge folder:
//   - the starter must FAIL the visible tests
//   - the solution must PASS the visible tests and the hidden checks
//   - every mutant (a plausible wrong answer in mutants/) must FAIL at least one
//     of them, so the tests cannot be satisfied by a wrong solution.
// The same rules run through real Pyodide in packages/runner (browser parity).
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const root = path.resolve("content");
const python = process.env.PYTHON ?? (process.platform === "win32" ? "python" : "python3");

function findChallenges(dir, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, e.name);
    if (!e.isDirectory()) continue;
    if (fs.existsSync(path.join(full, "tests.py"))) out.push(full);
    else findChallenges(full, out);
  }
  return out;
}

function run(challenge, testsFile, submission) {
  return spawnSync(python, ["-I", path.join(challenge, testsFile), submission], {
    env: { ...process.env, SUBMISSION: submission },
    encoding: "utf8",
    timeout: 30_000,
  });
}

let failed = 0;
const challenges = findChallenges(root);
for (const c of challenges) {
  const rel = path.relative(root, c);
  const problems = [];
  const hasHidden = fs.existsSync(path.join(c, "hidden_tests.py"));

  if (run(c, "tests.py", path.join(c, "starter.py")).status === 0) {
    problems.push("starter passes its tests (it must fail)");
  }

  const solution = path.join(c, "solution.py");
  const sv = run(c, "tests.py", solution);
  if (sv.status !== 0) problems.push(`solution fails visible tests:\n${sv.stdout}${sv.stderr}`);
  if (hasHidden) {
    const sh = run(c, "hidden_tests.py", solution);
    if (sh.status !== 0) problems.push(`solution fails hidden checks:\n${sh.stdout}${sh.stderr}`);
  }

  const mutantDir = path.join(c, "mutants");
  const mutants = fs.existsSync(mutantDir) ? fs.readdirSync(mutantDir).filter((f) => f.endsWith(".py")) : [];
  for (const m of mutants) {
    const file = path.join(mutantDir, m);
    const caught =
      run(c, "tests.py", file).status !== 0 || (hasHidden && run(c, "hidden_tests.py", file).status !== 0);
    if (!caught) problems.push(`mutant ${m} passes every test (tests are too weak)`);
  }

  if (problems.length === 0) {
    console.log(`ok    ${rel}  (hidden: ${hasHidden ? "yes" : "no"}, mutants caught: ${mutants.length})`);
  } else {
    failed++;
    console.log(`FAIL  ${rel}`);
    for (const p of problems) console.log(`        ${p}`);
  }
}
console.log(`\n${challenges.length} challenge(s) checked, ${failed} failed`);
process.exit(failed === 0 ? 0 : 1);
