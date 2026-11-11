import { cosine, HashingEmbedder } from "./embed";

export interface Hit<M> {
  id: string;
  text: string;
  score: number;
  meta: M | undefined;
}

/**
 * An in-memory vector store with exact (brute force) cosine search. Fine for the
 * hundreds of documents a lesson uses; real stores use approximate indexes to scale.
 */
export class VectorStore<M = unknown> {
  private readonly items: { id: string; text: string; vector: number[]; meta: M | undefined }[] = [];

  constructor(private readonly embedder: HashingEmbedder = new HashingEmbedder()) {}

  get size(): number {
    return this.items.length;
  }

  /** Adding an existing id replaces it. */
  add(id: string, text: string, meta?: M): void {
    const item = { id, text, vector: this.embedder.embed(text), meta };
    const at = this.items.findIndex((i) => i.id === id);
    if (at >= 0) this.items[at] = item;
    else this.items.push(item);
  }

  /** Best k matches, highest score first. Equal scores keep insertion order. */
  search(query: string, k = 3): Hit<M>[] {
    if (!Number.isInteger(k) || k < 1) throw new RangeError("k must be an integer >= 1");
    const q = this.embedder.embed(query);
    return this.items
      .map((item, order) => ({ item, order, score: cosine(q, item.vector) }))
      .sort((a, b) => b.score - a.score || a.order - b.order)
      .slice(0, k)
      .map(({ item, score }) => ({ id: item.id, text: item.text, score, meta: item.meta }));
  }
}
