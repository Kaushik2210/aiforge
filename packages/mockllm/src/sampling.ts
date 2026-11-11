/**
 * Next-token sampling, the part of an LLM you can see and tune.
 * Everything here is pure and works on plain arrays so a lesson can print each step.
 */

/** Softmax over logits divided by temperature. Temperature 0 means greedy: all mass on the largest logit. */
export function softmax(logits: readonly number[], temperature = 1): number[] {
  if (logits.length === 0) throw new RangeError("softmax needs at least one logit");
  if (!(temperature >= 0) || !Number.isFinite(temperature)) throw new RangeError("temperature must be a finite number >= 0");
  for (const l of logits) {
    if (Number.isNaN(l) || l === Infinity) throw new RangeError("logits must not contain NaN or +Infinity");
  }
  let maxLogit = -Infinity;
  for (const l of logits) if (l > maxLogit) maxLogit = l;
  if (maxLogit === -Infinity) throw new RangeError("at least one logit must be finite");
  if (temperature === 0) {
    // Ties go to the lowest index so greedy decoding is deterministic.
    let best = 0;
    for (const [i, l] of logits.entries()) if (l > (logits[best] ?? -Infinity)) best = i;
    return logits.map((_, i) => (i === best ? 1 : 0));
  }
  // Subtract the largest logit before dividing: exp never overflows, and a tiny temperature
  // just drives the other entries to 0 instead of producing NaN.
  const exps = logits.map((l) => Math.exp((l - maxLogit) / temperature));
  const sum = exps.reduce((a, b) => a + b, 0);
  return exps.map((e) => e / sum);
}

function checkedSum(probs: readonly number[]): number {
  let sum = 0;
  for (const p of probs) {
    if (!Number.isFinite(p) || p < 0) throw new RangeError("probabilities must be finite and >= 0");
    sum += p;
  }
  if (!(sum > 0)) throw new RangeError("probabilities must not all be zero");
  return sum;
}

function renormalise(probs: readonly number[]): number[] {
  const sum = checkedSum(probs);
  return probs.map((p) => p / sum);
}

/** Order of token indices from most to least likely. Ties keep the lower index first. */
function ranked(probs: readonly number[]): number[] {
  return probs.map((_, i) => i).sort((a, b) => (probs[b] ?? 0) - (probs[a] ?? 0) || a - b);
}

/** Keep the k most likely tokens, zero the rest, renormalise. */
export function topK(probs: readonly number[], k: number): number[] {
  if (!Number.isInteger(k) || k < 1) throw new RangeError("k must be an integer >= 1");
  const input = renormalise(probs);
  const keep = new Set(ranked(input).slice(0, k));
  return renormalise(input.map((p, i) => (keep.has(i) ? p : 0)));
}

/**
 * Nucleus (top-p) filtering: keep the smallest set of most likely tokens whose
 * cumulative probability reaches p, zero the rest, renormalise.
 */
export function topP(probs: readonly number[], p: number): number[] {
  if (!(p > 0 && p <= 1)) throw new RangeError("p must be in (0, 1]");
  const input = renormalise(probs); // accept unnormalised input, so p always means a share of the total
  const keep = new Set<number>();
  let cumulative = 0;
  for (const i of ranked(input)) {
    keep.add(i);
    cumulative += input[i] ?? 0;
    // A small epsilon stops float error from adding one token too many when p is exactly reached.
    if (cumulative >= p - 1e-12) break;
  }
  return renormalise(input.map((q, i) => (keep.has(i) ? q : 0)));
}

/** Draw an index from a probability vector using one uniform number in [0, 1). */
export function sampleIndex(probs: readonly number[], u: number): number {
  if (!(u >= 0 && u < 1)) throw new RangeError("u must be in [0, 1)");
  const total = checkedSum(probs);
  u *= total; // lets an unnormalised vector work too
  let acc = 0;
  let last = 0;
  for (const [i, p] of probs.entries()) {
    if (p > 0) last = i;
    acc += p;
    if (u < acc) return i;
  }
  return last; // u landed in float rounding slack at the top end
}

export interface SamplingOptions {
  temperature?: number;
  topK?: number;
  topP?: number;
}

/** Temperature, then top-k, then top-p, in that order, returning the final distribution. */
export function shapeDistribution(logits: readonly number[], opts: SamplingOptions = {}): number[] {
  let probs = softmax(logits, opts.temperature ?? 1);
  if (opts.topK !== undefined) probs = topK(probs, opts.topK);
  if (opts.topP !== undefined) probs = topP(probs, opts.topP);
  return probs;
}
