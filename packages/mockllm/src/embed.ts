import { hashString } from "./rng";
import { tokenize } from "./tokenize";

/**
 * A deterministic "embedding" built with the hashing trick: each word is hashed to
 * one of `dim` buckets with a +1 or -1 sign, counts are summed, and the vector is
 * scaled to length 1.
 *
 * Honest limit: this captures shared WORDS, not meaning. "car" and "automobile"
 * share nothing. Real embedding models are learned and do much better. It exists
 * so retrieval lessons run offline with reproducible numbers.
 */
export class HashingEmbedder {
  readonly dim: number;

  constructor(dim = 64) {
    if (!Number.isInteger(dim) || dim < 2) throw new RangeError("dim must be an integer >= 2");
    this.dim = dim;
  }

  embed(text: string): number[] {
    const v = new Array<number>(this.dim).fill(0);
    for (const token of tokenize(text)) {
      if (!/[\p{L}\p{N}]/u.test(token)) continue; // punctuation carries no topic, so it is skipped
      const h = hashString(token);
      const bucket = h % this.dim;
      // A second, independent bit of the hash picks the sign so collisions tend to cancel.
      const sign = (hashString(`sign:${token}`) & 1) === 0 ? 1 : -1;
      v[bucket] = (v[bucket] ?? 0) + sign;
    }
    const norm = Math.sqrt(v.reduce((a, b) => a + b * b, 0));
    return norm === 0 ? v : v.map((x) => x / norm);
  }
}

/** Cosine similarity. Returns 0 if either vector has zero length. */
export function cosine(a: readonly number[], b: readonly number[]): number {
  if (a.length !== b.length) throw new RangeError("vectors must have the same length");
  let dot = 0;
  let na = 0;
  let nb = 0;
  for (const [i, x] of a.entries()) {
    const y = b[i] ?? 0;
    dot += x * y;
    na += x * x;
    nb += y * y;
  }
  if (na === 0 || nb === 0) return 0;
  return Math.max(-1, Math.min(1, dot / (Math.sqrt(na) * Math.sqrt(nb)))); // clamp float error
}
