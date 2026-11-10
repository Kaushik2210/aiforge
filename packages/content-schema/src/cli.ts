import path from "node:path";
import { LessonFrontmatterSchema } from "./schemas";
import { checkSkillTreeAgainstQuests, findQuestDirs, readLesson, readSkillTree, validateQuest } from "./validate";

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

// The skill tree: valid on its own, and consistent with the quests that exist.
try {
  const tree = readSkillTree(root);
  const quests = dirs.flatMap((dir) => {
    const fm = LessonFrontmatterSchema.safeParse(readLesson(dir).data);
    return fm.success ? [{ id: fm.data.id, realm: fm.data.realm, prerequisites: fm.data.prerequisites }] : [];
  });
  const problems = checkSkillTreeAgainstQuests(tree, quests);
  if (problems.length === 0) {
    console.log(`ok    _skilltree.yml (${tree.topics.length} topics)`);
  } else {
    failed++;
    console.log("FAIL  _skilltree.yml");
    for (const p of problems) console.log(`        ${p}`);
  }
} catch (error) {
  failed++;
  console.log("FAIL  _skilltree.yml");
  console.log(`        ${error instanceof Error ? error.message : String(error)}`);
}

console.log(`\n${dirs.length} quest(s) and the skill tree checked, ${failed} failed`);
process.exit(failed === 0 ? 0 : 1);
