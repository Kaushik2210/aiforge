# ADR 0011: mockllm is TypeScript, scripted, and honest about being fake

Status: accepted, 2026-11-11

## Decision
`@aiforge/mockllm` is a TypeScript package with no runtime dependencies. It has
four parts: seeded sampling (temperature, top-k, top-p), a scripted `MockLLM`, a
hashing `HashingEmbedder`, and a brute-force cosine `VectorStore`.

## Why
- LLM lessons (chat UIs, streaming, tool calls, RAG) live in the browser app and its
  games, which are TypeScript. minitorch is Python because learners write tensor code
  in the Pyodide runner; the two have different audiences.
- Scripted replies make lessons free, offline, gradable and replayable: the first
  matching rule wins, and variants are picked by a seeded hash of the input, so the
  same input always gives the same output.
- Sampling is the part of a real LLM a learner can tune, so it is implemented for
  real and works on plain arrays a lesson can print step by step.

## What it is not
- Not a language model. It does not understand input; it matches patterns.
- The embedder captures shared words only ("car" and "automobile" score near zero).
  Lessons must say so and switch to a real embedding model (BYOK or a lab quest)
  when meaning matters.
- Token counts use a simple word and punctuation tokenizer, not BPE, so they are not
  comparable to a real model's counts.
- The reply shape (`content`, `finishReason`, `usage`, `toolCall`) is our own and is
  only loosely modelled on provider APIs. TODO-VERIFY before a lesson claims it matches
  a specific provider's response format.

## Sources
Holtzman et al. 2019 (top-p, top-k, temperature), Hinton et al. 2015 (softmax with
temperature), Weinberger et al. 2009 (feature hashing). See `research/03-llm-fundamentals.md`.

## Not done
- Beam search, repetition penalties, logit bias, a toy n-gram model that generates
  from probabilities, and mock rate limits or error injection.
- No lesson, challenge or game uses the package yet.
