// Challenge CI: for every challenge folder, the starter must fail its tests
// and the solution must pass them.
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

function run(challenge, file) {
  return spawnSync(python, ["-I", path.join(challenge, "tests.py"), path.join(challenge, file)], {
    env: { ...process.env, SUBMISSION: path.join(challenge, file) },
    encoding: "utf8",
    timeout: 30_000,
  });
}

let failed = 0;
const challenges = findChallenges(root);
for (const c of challenges) {
  const rel = path.relative(root, c);
  const starter = run(c, "starter.py");
  const solution = run(c, "solution.py");
  const starterFails = starter.status !== 0;
  const solutionPasses = solution.status === 0;
  if (starterFails && solutionPasses) {
    console.log(`ok    ${rel}`);
  } else {
    failed++;
    console.log(`FAIL  ${rel}`);
    if (!starterFails) console.log("        starter passes its tests (it must fail)");
    if (!solutionPasses) console.log(`        solution fails:\n${solution.stdout}${solution.stderr}`);
  }
}
console.log(`\n${challenges.length} challenge(s) checked, ${failed} failed`);
process.exit(failed === 0 ? 0 : 1);
