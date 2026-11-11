# mockllm

A deterministic, scripted stand-in for an LLM, an embedding model and a vector
store, so LLM lessons run free, offline and gradable. Same input and seed, same output.

It is a teaching tool, not a model: it matches patterns, it does not understand text.
See [ADR 0011](../../docs/adr/0011-mockllm-typescript.md).

```ts
import { MockLLM, VectorStore, softmax, topP } from "@aiforge/mockllm";

const llm = new MockLLM({
  seed: 1,
  rules: [
    { match: "hello", reply: "Hi there." },
    { match: /my name is (\w+)/i, reply: (_in, m) => `Nice to meet you, ${m![1]}.` },
    { match: "weather", reply: { toolCall: { name: "get_weather", arguments: { city: "Oslo" } } } },
  ],
});

const r = await llm.chat([{ role: "user", content: "my name is Ada" }]);
// r.content === "Nice to meet you, Ada."   r.finishReason === "stop"

for await (const chunk of llm.stream([{ role: "user", content: "hello" }])) console.log(chunk);

const probs = topP(softmax([3, 2, 1, 0], 0.7), 0.9); // temperature, then nucleus filtering
```

## What is inside
- `softmax(logits, temperature)`, `topK`, `topP`, `sampleIndex`, `shapeDistribution`: real sampling math.
- `MockLLM`: first matching rule wins; string, regex or function matchers; reply variants chosen by a seeded hash; tool-call replies; `maxTokens` truncation with `finishReason: "length"`; `stream()`; `calls` records every request.
- `HashingEmbedder` and `cosine`: deterministic word-hashing vectors (the hashing trick).
- `VectorStore`: exact cosine search over a few hundred documents.

## Limits you should know
- The embedder sees shared words, not meaning.
- Token counts come from a simple tokenizer and do not match any real model's.
- The response shape is our own, only loosely like provider APIs.
- A real model at temperature 0 is not guaranteed to be deterministic; this one is.

## Develop
```bash
pnpm --filter @aiforge/mockllm test
pnpm --filter @aiforge/mockllm typecheck
```
