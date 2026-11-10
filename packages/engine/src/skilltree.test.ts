import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  COL_GAP,
  NODE_H,
  NODE_W,
  assignLayers,
  countCrossings,
  layoutSkillTree,
  type TreeTopic,
} from "./skilltree";

const t = (id: string, prerequisites: string[] = [], realm = 1): TreeTopic => ({ id, title: id.toUpperCase(), realm, prerequisites });

/** Read the real tree without a YAML dependency: the file is flat and fixed-format. */
function realTopics(): TreeTopic[] {
  const text = fs.readFileSync(path.resolve(__dirname, "../../../content/_skilltree.yml"), "utf8");
  const out: TreeTopic[] = [];
  for (const line of text.split(/\r?\n/)) {
    const m = /\{ id: ([\w-]+), title: "([^"]+)", realm: (\d+), prerequisites: \[([^\]]*)\] \}/.exec(line);
    if (m) out.push({ id: m[1]!, title: m[2]!, realm: Number(m[3]), prerequisites: m[4]!.split(",").map((s) => s.trim()).filter(Boolean) });
  }
  return out;
}

describe("assignLayers", () => {
  it("roots are layer 0 and every topic is one deeper than its deepest prerequisite", () => {
    const layers = assignLayers([t("a"), t("b", ["a"]), t("c", ["a"]), t("d", ["b", "c"]), t("e", ["a", "d"])]);
    expect([...layers]).toEqual([["a", 0], ["b", 1], ["c", 1], ["d", 2], ["e", 3]]);
  });

  it("does not depend on the order topics are listed in", () => {
    const topics = [t("c", ["b"]), t("b", ["a"]), t("a")];
    expect(assignLayers(topics).get("c")).toBe(2);
  });

  it("throws on a cycle and on an unknown prerequisite", () => {
    expect(() => assignLayers([t("a", ["b"]), t("b", ["a"])])).toThrow(/cycle/);
    expect(() => assignLayers([t("a", ["ghost"])])).toThrow(/unknown topic "ghost"/);
  });
});

describe("layoutSkillTree", () => {
  const topics = [t("a"), t("b", ["a"]), t("c", ["a"]), t("d", ["b", "c"]), t("lone")];
  const layout = layoutSkillTree(topics);

  it("places every topic once and every edge strictly left to right", () => {
    expect(layout.nodes.map((n) => n.id).sort()).toEqual(["a", "b", "c", "d", "lone"]);
    const at = new Map(layout.nodes.map((n) => [n.id, n]));
    expect(layout.edges).toHaveLength(4);
    for (const e of layout.edges) expect(at.get(e.to)!.x).toBeGreaterThan(at.get(e.from)!.x);
  });

  it("never overlaps two nodes", () => {
    for (const a of layout.nodes) {
      for (const b of layout.nodes) {
        if (a === b) continue;
        const apart = a.x + NODE_W <= b.x || b.x + NODE_W <= a.x || a.y + NODE_H <= b.y || b.y + NODE_H <= a.y;
        expect(apart, `${a.id} vs ${b.id}`).toBe(true);
      }
    }
  });

  it("columns step by node width plus gap and the canvas fits every node", () => {
    const b = layout.nodes.find((n) => n.id === "b")!;
    const a = layout.nodes.find((n) => n.id === "a")!;
    expect(b.x - a.x).toBe(NODE_W + COL_GAP);
    for (const n of layout.nodes) {
      expect(n.x + NODE_W).toBeLessThanOrEqual(layout.width);
      expect(n.y + NODE_H).toBeLessThanOrEqual(layout.height);
    }
  });

  it("edge paths start at the source's right edge and end at the target's left edge", () => {
    const at = new Map(layout.nodes.map((n) => [n.id, n]));
    for (const e of layout.edges) {
      const a = at.get(e.from)!;
      const b = at.get(e.to)!;
      expect(e.d.startsWith(`M ${a.x + NODE_W} ${a.y + NODE_H / 2} C`)).toBe(true);
      expect(e.d.endsWith(`${b.x} ${b.y + NODE_H / 2}`)).toBe(true);
    }
  });

  it("is deterministic", () => {
    expect(layoutSkillTree(topics)).toEqual(layout);
  });

  it("handles empty, single and unknown-prerequisite input", () => {
    expect(layoutSkillTree([]).nodes).toEqual([]);
    expect(layoutSkillTree([t("x")]).nodes).toHaveLength(1);
    expect(() => layoutSkillTree([t("x", ["nope"])])).toThrow();
  });
});

describe("the real skill tree", () => {
  const topics = realTopics();
  const layout = layoutSkillTree(topics);

  it("parses every topic from the file", () => {
    expect(topics.length).toBeGreaterThanOrEqual(25);
  });

  it("puts foundations to the left of what builds on them", () => {
    const layer = new Map(layout.nodes.map((n) => [n.id, n.layer]));
    expect(layer.get("gradient-descent")!).toBeLessThan(layer.get("ml-fundamentals")!);
    expect(layer.get("ml-fundamentals")!).toBeLessThan(layer.get("data-leakage-and-splits")!);
    expect(layer.get("llm-fundamentals")!).toBeLessThan(layer.get("llm-apis")!);
    expect(layer.get("llm-apis")!).toBeLessThan(layer.get("retrieval-augmented-generation")!);
    expect(layer.get("derivatives-and-gradients")).toBe(0);
  });

  it("every edge points right and no two nodes overlap", () => {
    const at = new Map(layout.nodes.map((n) => [n.id, n]));
    for (const e of layout.edges) expect(at.get(e.to)!.x).toBeGreaterThan(at.get(e.from)!.x);
    for (let i = 0; i < layout.nodes.length; i++) {
      for (let j = i + 1; j < layout.nodes.length; j++) {
        const a = layout.nodes[i]!;
        const b = layout.nodes[j]!;
        const apart = a.x + NODE_W <= b.x || b.x + NODE_W <= a.x || a.y + NODE_H <= b.y || b.y + NODE_H <= a.y;
        expect(apart).toBe(true);
      }
    }
  });

  it("the crossing-reduction sweeps never make it worse than the plain ordering", () => {
    const plain = countCrossings(layoutSkillTree(topics, { sweeps: 0 }));
    const swept = countCrossings(layout);
    expect(swept).toBeLessThanOrEqual(plain);
  });

  it("stays a reasonable size", () => {
    expect(layout.width).toBeLessThan(2600);
    expect(layout.height).toBeLessThan(1400);
  });
});

describe("countCrossings", () => {
  it("counts an X as one crossing and parallel lines as none", () => {
    const x = layoutSkillTree([t("a"), t("b"), t("c", ["a"]), t("d", ["b"])], { sweeps: 0 });
    // Plain order: column 0 = a, b; column 1 = c, d  -> a->c and b->d run parallel.
    expect(countCrossings(x)).toBe(0);
    const swapped = {
      ...x,
      nodes: x.nodes.map((n) => (n.id === "c" ? { ...n, y: x.nodes.find((m) => m.id === "d")!.y } : n.id === "d" ? { ...n, y: x.nodes.find((m) => m.id === "c")!.y } : n)),
    };
    expect(countCrossings(swapped)).toBe(1);
  });
});
