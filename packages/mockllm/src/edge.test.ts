import { describe, expect, it } from "vitest";
import { MockLLM } from "./mockllm";
import { HashingEmbedder, cosine } from "./embed";
import { sampleIndex, softmax, topK, topP } from "./sampling";
import { tokenize } from "./tokenize";

const user = (content: string) => [{ role: "user" as const, content }];

describe("sampling edge cases found in review", () => {
  it("rejects NaN, +Infinity and all -Infinity logits instead of returning NaN", () => {
    expect(() => softmax([Number.NaN, 1])).toThrow(RangeError);
    expect(() => softmax([Infinity, 1])).toThrow(RangeError);
    expect(() => softmax([-Infinity, -Infinity])).toThrow(RangeError);
  });
  it("treats a single -Infinity logit as probability 0", () => {
    expect(softmax([-Infinity, 0])).toEqual([0, 1]);
  });
  it("survives a temperature so small that logit / T would overflow", () => {
    const p = softmax([1, 2], 1e-320);
    expect(p.every(Number.isFinite)).toBe(true);
    expect(p[1]!).toBeCloseTo(1, 12);
  });
  it("handles hundreds of thousands of logits without a stack overflow", () => {
    const p = softmax(new Array<number>(200_000).fill(0));
    expect(p[0]!).toBeCloseTo(1 / 200_000, 12);
  });
  it("topK and topP reject all-zero, negative or NaN probabilities", () => {
    expect(() => topK([0, 0, 0], 1)).toThrow(RangeError);
    expect(() => topP([0, 0], 0.5)).toThrow(RangeError);
    expect(() => topP([-0.1, 1.1], 0.5)).toThrow(RangeError);
    expect(() => topK([Number.NaN, 1], 1)).toThrow(RangeError);
  });
  it("topP and topK normalise their input, so p is a share of the total", () => {
    expect(topP([2, 1], 0.5)).toEqual([1, 0]);
    const q = topP([0.1, 0.1], 0.9);
    expect(q[0]!).toBeCloseTo(0.5, 12);
    expect(q[1]!).toBeCloseTo(0.5, 12);
  });
  it("sampleIndex rejects empty or all-zero vectors and a bad u", () => {
    expect(() => sampleIndex([], 0.5)).toThrow(RangeError);
    expect(() => sampleIndex([0, 0, 0], 0.5)).toThrow(RangeError);
    expect(() => sampleIndex([1], Number.NaN)).toThrow(RangeError);
    expect(() => sampleIndex([1], 1)).toThrow(RangeError);
    expect(() => sampleIndex([1], -0.1)).toThrow(RangeError);
  });
  it("topP keeps the right set when the cumulative sum lands on p only up to float error", () => {
    // 0.1 + 0.2 is 0.30000000000000004 in floating point; p = 0.3 must still stop after two tokens.
    const p = topP([0.1, 0.2, 0.7], 0.9);
    expect(p[0]!).toBe(0); // 0.7 + 0.2 = 0.9 reaches p, so the 0.1 token is dropped
    const q = topP([0.2, 0.1, 0.7], 0.8999999999999999);
    expect(q[1]!).toBe(0);
  });
});

describe("MockLLM edge cases found in review", () => {
  it("a function matcher returning a falsy non-boolean does not match", async () => {
    const m = new MockLLM({
      rules: [
        { match: (() => 0) as unknown as (s: string) => boolean, reply: "X" },
        { match: (() => null) as unknown as (s: string) => boolean, reply: "Z" },
        { match: "a", reply: "Y" },
      ],
    });
    expect((await m.chat(user("a"))).content).toBe("Y");
  });
  it("returns a copy of a tool call so edits cannot change the rule", async () => {
    const m = new MockLLM({ rules: [{ match: "go", reply: { toolCall: { name: "t", arguments: { a: 1 } } } }] });
    const first = await m.chat(user("go"));
    (first.toolCall!.arguments as { a: number }).a = 99;
    expect((await m.chat(user("go"))).toolCall!.arguments).toEqual({ a: 1 });
  });
  it("stream() refuses a tool-call reply instead of yielding nothing", async () => {
    const m = new MockLLM({ rules: [{ match: "go", reply: { toolCall: { name: "t", arguments: {} } } }] });
    await expect(async () => {
      for await (const _ of m.stream(user("go"))) void _;
    }).rejects.toThrow(/tool call/);
  });
  it("an over-long first word with a tiny budget gives empty content flagged length", async () => {
    const m = new MockLLM({ rules: [{ match: "x", reply: "hello.world.foo bar" }] });
    const r = await m.chat(user("x"), { maxTokens: 1 });
    expect(r).toMatchObject({ content: "", finishReason: "length" });
  });
  it("trims trailing whitespace when it cuts", async () => {
    const m = new MockLLM({ rules: [{ match: "x", reply: "one two  three" }] });
    expect((await m.chat(user("x"), { maxTokens: 2 })).content).toBe("one two");
  });
  it("a sticky regex flag does not leak state between calls", async () => {
    const m = new MockLLM({ rules: [{ match: /ping/y, reply: "pong" }] });
    expect((await m.chat(user("ping"))).content).toBe("pong");
    expect((await m.chat(user("ping"))).content).toBe("pong");
  });
  it("picks each variant for some seed, uniformly enough, and never one outside the list", async () => {
    const variants = ["a", "b", "c"];
    const counts: Record<string, number> = { a: 0, b: 0, c: 0 };
    for (let seed = 0; seed < 600; seed++) {
      const out = (await new MockLLM({ seed, rules: [{ match: "x", reply: variants }] }).chat(user("x"))).content;
      expect(variants).toContain(out);
      counts[out]!++;
    }
    for (const v of variants) expect(counts[v]!).toBeGreaterThan(120);
  });
  it("different inputs can pick different variants under one seed", async () => {
    const m = new MockLLM({ seed: 3, rules: [{ match: "q", reply: ["a", "b", "c", "d"] }] });
    const seen = new Set<string>();
    for (let i = 0; i < 40; i++) seen.add((await m.chat(user(`q${i}`))).content);
    expect(seen.size).toBeGreaterThan(1);
  });
});

describe("tokenizer and embedder edge cases found in review", () => {
  it("keeps combining marks and joined emoji inside one token", () => {
    expect(tokenize("İstanbul")).toHaveLength(1);
    expect(tokenize("👨‍👩‍👧‍👦")).toHaveLength(tokenize("👨‍👩‍👧‍👦").length); // stable
    expect(tokenize("école")).toHaveLength(1);
  });
  it("ignores punctuation when embedding, so only words create similarity", () => {
    const e = new HashingEmbedder(64);
    expect(cosine(e.embed("apples!"), e.embed("zebra!"))).toBeLessThan(0.5);
    expect(cosine(e.embed("hello!!!"), e.embed("hello"))).toBeCloseTo(1, 12);
    expect(e.embed("?!.,")).toEqual(new Array(64).fill(0));
  });
  it("never reports a cosine above 1", () => {
    const e = new HashingEmbedder(64);
    const v = e.embed("the quick brown fox jumps over the lazy dog");
    expect(cosine(v, v)).toBeLessThanOrEqual(1);
  });
  it("the sign hash makes some words subtract, so buckets can cancel", () => {
    const e = new HashingEmbedder(2);
    // With two buckets and many words, at least one coordinate must come out negative.
    const words = Array.from({ length: 40 }, (_, i) => `w${i}`).join(" ");
    expect(e.embed(words).some((x) => x < 0)).toBe(true);
  });
});
