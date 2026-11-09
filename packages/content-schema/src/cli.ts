import path from "node:path";
import { findQuestDirs, validateQuest } from "./validate";

const root = path.resolve(process.argv[2] ?? "content");
const dirs = findQuestDirs(root);
let failed = 0;

for (const dir of dirs) {
  const { errors } = validateQuest(dir);
  const rel = path.relative(root, dir);
  if (errors.length === 0) {
    console.log(`ok    ${rel}`);
  } else {
    failed++;
    console.log(`FAIL  ${rel}`);
    for (const e of errors) console.log(`        ${e}`);
  }
}

console.log(`\n${dirs.length} quest(s) checked, ${failed} failed`);
process.exit(failed === 0 ? 0 : 1);
