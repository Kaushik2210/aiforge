import { describe, expect, it } from "vitest";
import { MockLLM, type Message } from "./mockllm";
import { HashingEmbedder, cosine } from "./embed";
import { VectorStore } from "./vectorstore";
import { tokenize } from "./tokenize";

const user = (content: string): Message[] => [{ role: "user", content }];

describe("MockLLM", () => {
  const rules = [
    { match: "hello", reply: "Hi there." },
    { match: /my name is (\w+)/i, reply: (_: string, m: RegExpMatchArray | null) => `Nice to meet you, ${m![1]}.` },
    { match: "weather", reply: { toolCall: { name: "get_weather", arguments: { city: "Oslo" } } } },
    { match: "joke", reply: ["Joke A.", "Joke B.", "Joke C."] },
    { match: "long", reply: "one two three four five six seven eight" },
  ];
  const llm = () => new MockLLM({ rules, seed: 1 });

  it("answers from the first matching rule, case-insensitively", async () => {
    expect((await llm().chat(user("HELLO world"))).content).toBe("Hi there.");
  });
  it("passes regex captures to function replies", async () => {
    expect((await llm().chat(user("my name is Ada"))).content).toBe("Nice to meet you, Ada.");
  });
  it("uses the fallback when nothing matches", async () => {
    expect((await llm().chat(user("zzz"))).content).toMatch(/do not have a scripted answer/);
    expect((await new MockLLM({ rules: [], fallback: "?" }).chat(user("x"))).content).toBe("?");
  });
  it("matches against the last user message, not the system prompt", async () => {
    const r = await llm().chat([
      { role: "system", content: "say hello always" },
      { role: "user", content: "my name is Bo" },
    ]);
    expect(r.content).toBe("Nice to meet you, Bo.");
  });
  it("returns a tool call with the right finish reason", async () => {
    const r = await llm().chat(user("what is the weather"));
    expect(r.finishReason).toBe("tool_call");
    expect(r.toolCall).toEqual({ name: "get_weather", arguments: { city: "Oslo" } });
    expect(r.content).toBe("");
  });
  it("is deterministic: same seed and input pick the same variant every time", async () => {
    const first = (await llm().chat(user("tell me a joke"))).content;
    for (let i = 0; i < 20; i++) expect((await llm().chat(user("tell me a joke"))).content).toBe(first);
  });
  it("the seed can change which variant is picked", async () => {
    const seen = new Set<string>();
    for (let seed = 0; seed < 30; seed++) seen.add((await new MockLLM({ rules, seed }).chat(user("a joke"))).content);
    expect(seen.size).toBeGreaterThan(1);
  });
  it("truncates at maxTokens and says so", async () => {
    const r = await llm().chat(user("long"), { maxTokens: 3 });
    expect(r.content).toBe("one two three");
    expect(r.finishReason).toBe("length");
    expect(r.usage.completionTokens).toBe(3);
  });
  it("does not flag length when the reply fits exactly", async () => {
    const r = await llm().chat(user("long"), { maxTokens: 8 });
    expect(r.finishReason).toBe("stop");
  });
  it("rejects a bad maxTokens", async () => {
    await expect(llm().chat(user("hello"), { maxTokens: 0 })).rejects.toThrow(RangeError);
  });
  it("streams chunks that join to the full reply", async () => {
    let joined = "";
    let count = 0;
    for await (const c of llm().stream(user("long"))) {
      joined += c;
      count++;
    }
    expect(joined).toBe("one two three four five six seven eight");
    expect(count).toBe(8);
  });
  it("records every request so lessons can assert on what was sent", async () => {
    const m = llm();
    await m.chat(user("hello"));
    await m.chat(user("zzz"));
    expect(m.calls).toHaveLength(2);
    expect(m.calls[1]![0]!.content).toBe("zzz");
  });
  it("does not let a global regex keep state between calls", async () => {
    const m = new MockLLM({ rules: [{ match: /ping/g, reply: "pong" }] });
    expect((await m.chat(user("ping"))).content).toBe("pong");
    expect((await m.chat(user("ping"))).content).toBe("pong");
  });
  it("counts prompt tokens with the simple tokenizer", async () => {
    const r = await llm().chat(user("hello, world"));
    expect(r.usage.promptTokens).toBe(tokenize("hello, world").length);
  });
});

describe("HashingEmbedder", () => {
  const e = new HashingEmbedder(64);
  it("is deterministic and unit length", () => {
    const a = e.embed("gradient descent minimises loss");
    expect(a).toEqual(e.embed("gradient descent minimises loss"));
    expect(Math.sqrt(a.reduce((s, x) => s + x * x, 0))).toBeCloseTo(1, 12);
  });
  it("is case-insensitive and ignores word order", () => {
    expect(cosine(e.embed("Learning Rate"), e.embed("rate learning"))).toBeCloseTo(1, 12);
  });
  it("scores shared words higher than unrelated text", () => {
    const q = e.embed("how does gradient descent work");
    expect(cosine(q, e.embed("gradient descent steps downhill"))).toBeGreaterThan(cosine(q, e.embed("pasta recipe with tomato")));
  });
  it("cannot see meaning without shared words (documented limit)", () => {
    expect(cosine(e.embed("car"), e.embed("automobile"))).toBeLessThan(0.5);
  });
  it("gives the zero vector for empty text and cosine 0", () => {
    expect(e.embed("")).toEqual(new Array(64).fill(0));
    expect(cosine(e.embed(""), e.embed("x"))).toBe(0);
  });
  it("rejects bad dimensions and mismatched vectors", () => {
    expect(() => new HashingEmbedder(1)).toThrow(RangeError);
    expect(() => cosine([1], [1, 2])).toThrow(RangeError);
  });
});

describe("VectorStore", () => {
  const store = () => {
    const s = new VectorStore<{ tag: string }>(new HashingEmbedder(256));
    s.add("a", "gradient descent follows the slope of the loss", { tag: "opt" });
    s.add("b", "attention lets tokens look at each other", { tag: "tf" });
    s.add("c", "tomato pasta with basil", { tag: "food" });
    return s;
  };
  it("returns the most relevant document first, with metadata", () => {
    const hits = store().search("what does gradient descent do to the loss", 2);
    expect(hits[0]!.id).toBe("a");
    expect(hits[0]!.meta).toEqual({ tag: "opt" });
    expect(hits).toHaveLength(2);
  });
  it("scores are sorted descending", () => {
    const hits = store().search("attention and tokens", 3);
    for (let i = 1; i < hits.length; i++) expect(hits[i - 1]!.score).toBeGreaterThanOrEqual(hits[i]!.score);
  });
  it("replaces a document with the same id instead of duplicating it", () => {
    const s = store();
    s.add("a", "something else entirely");
    expect(s.size).toBe(3);
  });
  it("keeps insertion order for equal scores", () => {
    const s = new VectorStore();
    s.add("first", "same words");
    s.add("second", "same words");
    expect(s.search("same words", 2).map((h) => h.id)).toEqual(["first", "second"]);
  });
  it("handles an empty store and a bad k", () => {
    expect(new VectorStore().search("x")).toEqual([]);
    expect(() => store().search("x", 0)).toThrow(RangeError);
  });
});
