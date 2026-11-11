# Research notes: LLM fundamentals

## MockLLM sources (Day 14)

Fetched 2026-11-11. All points paraphrased. verifiedOn: 2026-11-11.

1. **Holtzman et al. 2019, "The Curious Case of Neural Text Degeneration"**
   https://arxiv.org/abs/1904.09751 (full text read via ar5iv.labs.arxiv.org/html/1904.09751).
   Nucleus (top-p) sampling, Sec 3.1: V^(p) is the smallest set of tokens whose
   probabilities sum to at least p. With p' the mass of that set, kept tokens get
   P(x)/p' and every other token gets 0 (renormalised). Set size adapts per step.
   Sec 3.2 top-k keeps a fixed k tokens and renormalises the same way; retained
   mass varies. Sec 3.3 temperature divides logits before softmax; t below 1
   sharpens the distribution at a cost in diversity.

2. **Hinton, Vinyals, Dean 2015, "Distilling the Knowledge in a Neural Network"**
   https://arxiv.org/abs/1503.02531 (via ar5iv). Softmax with temperature:
   q_i = exp(z_i/T) / sum_j exp(z_j/T), T normally 1. Higher T gives a softer
   distribution (logit gaps shrink). Note: the paper uses T for distillation, not
   for generation; applying it to sampling is the standard reuse.
   **Fan, Lewis, Dauphin 2018**, https://arxiv.org/abs/1805.04833 (via ar5iv):
   reports top-k sampling (k=10) beat beam search for story generation, which
   gave generic, repetitive text. The detailed top-k wording is in Holtzman Sec 3.2;
   the Fan fetch returned only a summary (TODO-VERIFY exact section/wording).

3. **Determinism docs (partly unverified).**
   - OpenAI, https://developers.openai.com/api/docs/guides/text : says model output
     is non-deterministic; recommends pinning model snapshots. The page did not
     mention temperature or seed.
   - OpenAI cookbook, https://developers.openai.com/cookbook/examples/reproducible_outputs_with_the_seed_parameter :
     same seed and settings make a best-effort attempt at the same result, with no
     guarantee; system_fingerprint identifies backend config; matching seed, params
     and fingerprint should give mostly identical outputs.
   - Anthropic, https://platform.claude.com/docs/en/api/messages and
     /api/python/messages/create : the fetched parameter lists (max_tokens, system,
     thinking, tool_choice, etc.) did not show a `temperature` entry, and no
     determinism guarantee was found. TODO-VERIFY what Anthropic docs claim for
     temperature 0 (likely "not fully deterministic"; do not state until read).

4. **Weinberger et al. 2009, "Feature Hashing for Large Scale Multitask Learning"**
   https://arxiv.org/abs/0902.2206 (definitions via ar5iv). Hashed map uses a bucket
   hash h: N -> {1..m} and a sign hash xi: N -> {+1,-1}; each output bucket sums the
   signed values of coordinates landing in it. Lemma 2: the hashed inner product is
   unbiased (expectation equals the true inner product), variance O(1/m) for
   unit-norm vectors. The sign hash removes the bias of the earlier unsigned kernel.
   Cosine similarity definition (dot product over norms): not fetched this session,
   TODO-VERIFY with a primary source (e.g. Manning, Raghavan, Schutze IR book).
