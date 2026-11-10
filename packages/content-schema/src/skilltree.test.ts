import path from "node:path";
import { describe, expect, it } from "vitest";
import { SkillTreeSchema, findCycle } from "./schemas";
import { checkSkillTreeAgainstQuests, findQuestDirs, readLesson, readSkillTree } from "./validate";

const contentRoot = path.resolve(__dirname, "../../../content");
const t = (id: string, realm = 1, prerequisites: string[] = []) => ({ id, title: `Topic ${id}`, realm, prerequisites });
const parse = (topics: ReturnType<typeof t>[]) => SkillTreeSchema.safeParse({ topics });
const messages = (topics: ReturnType<typeof t>[]) => {
  const r = parse(topics);
  return r.success ? [] : r.error.issues.map((i) => i.message);
};

describe("SkillTreeSchema", () => {
  it("accepts a valid tree, including a diamond (two paths to one topic)", () => {
    expect(parse([t("a"), t("b", 1, ["a"]), t("c", 1, ["a"]), t("d", 1, ["b", "c"])]).success).toBe(true);
  });

  it("rejects an unknown prerequisite", () => {
    expect(messages([t("a", 1, ["ghost"])]).join()).toMatch(/unknown topic "ghost"/);
  });

  it("rejects a duplicate id", () => {
    expect(messages([t("a"), t("a")]).join()).toMatch(/duplicate topic id "a"/);
  });

  it("rejects a topic that needs itself", () => {
    expect(messages([t("a", 1, ["a"])]).join()).toMatch(/itself/);
  });

  it("rejects a prerequisite from a later realm", () => {
    expect(messages([t("early", 2, ["late"]), t("late", 5)]).join()).toMatch(/later realm/);
  });

  it("rejects a repeated prerequisite", () => {
    expect(messages([t("a"), t("b", 1, ["a", "a"])]).join()).toMatch(/twice/);
  });

  it("rejects bad ids, realms and an empty tree", () => {
    expect(parse([t("Not A Slug")]).success).toBe(false);
    expect(parse([t("a", 0)]).success).toBe(false);
    expect(parse([t("a", 24)]).success).toBe(false);
    expect(parse([]).success).toBe(false);
  });

  it("rejects cycles of length 2 and 3 and names the path", () => {
    expect(messages([t("a", 1, ["b"]), t("b", 1, ["a"])]).join()).toMatch(/cycle: .*a.*b.*a|cycle: .*b.*a.*b/);
    expect(messages([t("a", 1, ["c"]), t("b", 1, ["a"]), t("c", 1, ["b"])]).join()).toMatch(/cycle/);
  });
});

describe("findCycle", () => {
  it("returns null for acyclic graphs, including shared ancestors", () => {
    expect(findCycle([t("a"), t("b", 1, ["a"]), t("c", 1, ["a", "b"])])).toBeNull();
    expect(findCycle([])).toBeNull();
  });

  it("finds a cycle that is not at the start of the list", () => {
    const cycle = findCycle([t("x"), t("a", 1, ["b"]), t("b", 1, ["c"]), t("c", 1, ["a"])])!;
    expect(cycle[0]).toBe(cycle.at(-1));
    expect(new Set(cycle.slice(0, -1))).toEqual(new Set(["a", "b", "c"]));
  });

  it("ignores unknown ids instead of crashing", () => {
    expect(findCycle([t("a", 1, ["ghost"])])).toBeNull();
  });
});

describe("the real skill tree", () => {
  const tree = readSkillTree(contentRoot);

  it("is valid and has a healthy number of topics across realms", () => {
    expect(tree.topics.length).toBeGreaterThanOrEqual(25);
    expect(new Set(tree.topics.map((x) => x.realm)).size).toBeGreaterThanOrEqual(7);
  });

  it("is consistent with the quests that exist", () => {
    const quests = findQuestDirs(contentRoot).map((dir) => {
      const d = readLesson(dir).data as { id: string; realm: number; prerequisites?: string[] };
      return { id: d.id, realm: d.realm, prerequisites: d.prerequisites ?? [] };
    });
    expect(quests.length).toBeGreaterThan(0);
    expect(checkSkillTreeAgainstQuests(tree, quests)).toEqual([]);
  });
});

describe("checkSkillTreeAgainstQuests", () => {
  const tree = SkillTreeSchema.parse({ topics: [t("a", 2), t("b", 2, ["a"])] });

  it("flags a quest missing from the tree, a realm mismatch and an unlisted prerequisite", () => {
    expect(checkSkillTreeAgainstQuests(tree, [{ id: "zzz", realm: 1, prerequisites: [] }])[0]).toMatch(/no entry/);
    expect(checkSkillTreeAgainstQuests(tree, [{ id: "a", realm: 3, prerequisites: [] }])[0]).toMatch(/realm 3.*realm 2/);
    expect(checkSkillTreeAgainstQuests(tree, [{ id: "a", realm: 2, prerequisites: ["b"] }])[0]).toMatch(/requires "b"/);
  });

  it("passes when a quest's prerequisites are a subset of the tree's", () => {
    expect(checkSkillTreeAgainstQuests(tree, [{ id: "b", realm: 2, prerequisites: ["a"] }, { id: "a", realm: 2, prerequisites: [] }])).toEqual([]);
  });
});
