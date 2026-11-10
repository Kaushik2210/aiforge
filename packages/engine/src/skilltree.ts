/**
 * Skill tree layout: topics as a left-to-right graph, one column per "layer".
 * Pure geometry, no drawing code, so it is fully unit-tested.
 *
 * layer(topic) = 0 if it has no prerequisites, otherwise 1 + the deepest layer
 * among its prerequisites, so every edge points strictly to the right.
 * Rows within a column are ordered to reduce edge crossings (barycentre sweeps).
 */

export interface TreeTopic {
  id: string;
  title: string;
  realm: number;
  prerequisites: readonly string[];
}

export interface TreeNode {
  id: string;
  title: string;
  realm: number;
  layer: number;
  row: number;
  x: number;
  y: number;
}

export interface TreeEdge {
  from: string;
  to: string;
  /** SVG path from the right edge of `from` to the left edge of `to`. */
  d: string;
}

export interface TreeLayout {
  nodes: TreeNode[];
  edges: TreeEdge[];
  width: number;
  height: number;
  layers: number;
}

export const NODE_W = 196;
export const NODE_H = 68;
export const COL_GAP = 84;
export const ROW_GAP = 26;
export const PAD = 24;

/** Depth of every topic. Throws on an unknown prerequisite or a cycle. */
export function assignLayers(topics: readonly TreeTopic[]): Map<string, number> {
  const byId = new Map(topics.map((t) => [t.id, t]));
  const layers = new Map<string, number>();
  const visiting = new Set<string>();
  const depth = (id: string): number => {
    const known = layers.get(id);
    if (known !== undefined) return known;
    if (visiting.has(id)) throw new Error(`prerequisite cycle through "${id}"`);
    const topic = byId.get(id);
    if (!topic) throw new Error(`unknown topic "${id}"`);
    visiting.add(id);
    const d = topic.prerequisites.length === 0 ? 0 : 1 + Math.max(...topic.prerequisites.map(depth));
    visiting.delete(id);
    layers.set(id, d);
    return d;
  };
  for (const t of topics) depth(t.id);
  return layers;
}

export interface LayoutOptions {
  /** Barycentre passes to reduce crossings. 0 keeps the plain realm-then-title order. */
  sweeps?: number;
}

export function layoutSkillTree(topics: readonly TreeTopic[], opts: LayoutOptions = {}): TreeLayout {
  if (topics.length === 0) return { nodes: [], edges: [], width: PAD * 2, height: PAD * 2, layers: 0 };
  const sweeps = opts.sweeps ?? 4;
  const layerOf = assignLayers(topics);
  const layerCount = Math.max(...layerOf.values()) + 1;

  const columns: TreeTopic[][] = Array.from({ length: layerCount }, () => []);
  for (const t of topics) columns[layerOf.get(t.id)!]!.push(t);
  for (const col of columns) col.sort((a, b) => a.realm - b.realm || a.title.localeCompare(b.title) || a.id.localeCompare(b.id));

  const dependents = new Map<string, string[]>(topics.map((t) => [t.id, []]));
  for (const t of topics) for (const p of t.prerequisites) dependents.get(p)!.push(t.id);

  // Position of each topic as a 0..1 fraction of its column, used for barycentres.
  const frac = new Map<string, number>();
  const refresh = () => {
    for (const col of columns) col.forEach((t, i) => frac.set(t.id, (i + 0.5) / col.length));
  };
  refresh();

  const resort = (col: TreeTopic[], neighbours: (t: TreeTopic) => readonly string[]) => {
    const order = new Map(col.map((t, i) => [t.id, i]));
    const key = (t: TreeTopic) => {
      const ns = neighbours(t);
      return ns.length ? ns.reduce((s, id) => s + frac.get(id)!, 0) / ns.length : frac.get(t.id)!;
    };
    const keys = new Map(col.map((t) => [t.id, key(t)]));
    col.sort((a, b) => keys.get(a.id)! - keys.get(b.id)! || order.get(a.id)! - order.get(b.id)!);
  };

  for (let s = 0; s < sweeps; s++) {
    for (let l = 1; l < layerCount; l++) {
      resort(columns[l]!, (t) => t.prerequisites);
      refresh();
    }
    for (let l = layerCount - 2; l >= 0; l--) {
      resort(columns[l]!, (t) => dependents.get(t.id)!);
      refresh();
    }
  }

  const maxRows = Math.max(...columns.map((c) => c.length));
  const nodes: TreeNode[] = [];
  columns.forEach((col, layer) => {
    const offset = ((maxRows - col.length) * (NODE_H + ROW_GAP)) / 2;
    col.forEach((t, row) => {
      nodes.push({
        id: t.id, title: t.title, realm: t.realm, layer, row,
        x: PAD + layer * (NODE_W + COL_GAP),
        y: PAD + offset + row * (NODE_H + ROW_GAP),
      });
    });
  });

  const at = new Map(nodes.map((n) => [n.id, n]));
  const edges: TreeEdge[] = [];
  for (const t of topics) {
    for (const p of t.prerequisites) {
      const a = at.get(p)!;
      const b = at.get(t.id)!;
      const x1 = a.x + NODE_W;
      const y1 = a.y + NODE_H / 2;
      const x2 = b.x;
      const y2 = b.y + NODE_H / 2;
      const dx = (x2 - x1) * 0.5;
      edges.push({ from: p, to: t.id, d: `M ${x1} ${y1} C ${x1 + dx} ${y1}, ${x2 - dx} ${y2}, ${x2} ${y2}` });
    }
  }

  return {
    nodes,
    edges,
    width: PAD * 2 + layerCount * NODE_W + (layerCount - 1) * COL_GAP,
    height: PAD * 2 + maxRows * NODE_H + (maxRows - 1) * ROW_GAP,
    layers: layerCount,
  };
}

/** Number of edge pairs that cross, measured between node centres. Used to check the ordering helps. */
export function countCrossings(layout: TreeLayout): number {
  const at = new Map(layout.nodes.map((n) => [n.id, n]));
  const seg = (e: TreeEdge) => {
    const a = at.get(e.from)!;
    const b = at.get(e.to)!;
    return { x1: a.x + NODE_W, y1: a.y + NODE_H / 2, x2: b.x, y2: b.y + NODE_H / 2, from: e.from, to: e.to };
  };
  const cross = (p: ReturnType<typeof seg>, q: ReturnType<typeof seg>) => {
    if (p.from === q.from || p.to === q.to || p.from === q.to || p.to === q.from) return false; // share an end
    const d = (ax: number, ay: number, bx: number, by: number, cx: number, cy: number) => (bx - ax) * (cy - ay) - (by - ay) * (cx - ax);
    const d1 = d(p.x1, p.y1, p.x2, p.y2, q.x1, q.y1);
    const d2 = d(p.x1, p.y1, p.x2, p.y2, q.x2, q.y2);
    const d3 = d(q.x1, q.y1, q.x2, q.y2, p.x1, p.y1);
    const d4 = d(q.x1, q.y1, q.x2, q.y2, p.x2, p.y2);
    return d1 * d2 < 0 && d3 * d4 < 0;
  };
  const segs = layout.edges.map(seg);
  let n = 0;
  for (let i = 0; i < segs.length; i++) for (let j = i + 1; j < segs.length; j++) if (cross(segs[i]!, segs[j]!)) n++;
  return n;
}
