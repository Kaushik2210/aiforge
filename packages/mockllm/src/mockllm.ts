import { chunkForStreaming, tokenize } from "./tokenize";
import { hashString, makeRng } from "./rng";

export type Role = "system" | "user" | "assistant" | "tool";

export interface Message {
  role: Role;
  content: string;
}

export interface ToolCall {
  name: string;
  arguments: Record<string, unknown>;
}

/** What a rule answers with: text, a few text variants, or a tool call. */
export type Single = string | { toolCall: ToolCall };
export type Reply = Single | readonly string[];

export interface Rule {
  /** Matched against the last user message. Strings match as case-insensitive substrings. */
  match: string | RegExp | ((input: string) => boolean);
  reply: Reply | ((input: string, match: RegExpMatchArray | null) => Reply);
}

export interface ChatOptions {
  /** Cap on the reply length in mock tokens (see tokenize). Longer replies are cut and flagged "length". */
  maxTokens?: number;
}

export interface ChatResult {
  content: string;
  toolCall?: ToolCall;
  finishReason: "stop" | "length" | "tool_call";
  usage: { promptTokens: number; completionTokens: number };
}

export interface MockLLMOptions {
  rules: readonly Rule[];
  /** Used when no rule matches. */
  fallback?: string;
  /** Picks between reply variants. The same seed and input always give the same variant. */
  seed?: number;
}

/**
 * A scripted stand-in for a chat model. It does not understand anything: it finds
 * the first rule matching the last user message and returns that rule's reply.
 * Same input, same seed, same output, so lessons can be graded and replayed offline.
 */
export class MockLLM {
  private readonly rules: readonly Rule[];
  private readonly fallback: string;
  private readonly seed: number;
  /** Every request seen, in order, so tests and lessons can assert on what was sent. */
  readonly calls: Message[][] = [];

  constructor(opts: MockLLMOptions) {
    this.rules = opts.rules;
    this.fallback = opts.fallback ?? "I do not have a scripted answer for that.";
    this.seed = opts.seed ?? 0;
  }

  async chat(messages: readonly Message[], opts: ChatOptions = {}): Promise<ChatResult> {
    if (opts.maxTokens !== undefined && (!Number.isInteger(opts.maxTokens) || opts.maxTokens < 1)) {
      throw new RangeError("maxTokens must be an integer >= 1");
    }
    this.calls.push(messages.map((m) => ({ ...m })));
    const promptTokens = messages.reduce((n, m) => n + tokenize(m.content).length, 0);
    const input = lastUserMessage(messages);
    const reply = this.resolve(input);

    if (typeof reply !== "string") {
      return { content: "", toolCall: reply.toolCall, finishReason: "tool_call", usage: { promptTokens, completionTokens: 0 } };
    }
    let content = reply;
    let finishReason: ChatResult["finishReason"] = "stop";
    const words = chunkForStreaming(content);
    if (opts.maxTokens !== undefined && tokenize(content).length > opts.maxTokens) {
      // Cut on word boundaries until the mock token budget is met.
      let kept = "";
      for (const w of words) {
        if (tokenize(kept + w).length > opts.maxTokens) break;
        kept += w;
      }
      content = kept.trimEnd();
      finishReason = "length";
    }
    return { content, finishReason, usage: { promptTokens, completionTokens: tokenize(content).length } };
  }

  /** Yields the reply a word at a time. Joining the chunks gives exactly the text chat() would return. */
  async *stream(messages: readonly Message[], opts: ChatOptions = {}): AsyncGenerator<string> {
    const result = await this.chat(messages, opts);
    for (const chunk of chunkForStreaming(result.content)) yield chunk;
  }

  private resolve(input: string): Single {
    for (const rule of this.rules) {
      const m = matchRule(rule, input);
      if (m === false) continue;
      const reply = typeof rule.reply === "function" ? rule.reply(input, m === true ? null : m) : rule.reply;
      return this.pickVariant(reply, input);
    }
    return this.fallback;
  }

  private pickVariant(reply: Reply, input: string): Single {
    if (typeof reply === "string" || !("length" in reply)) return reply;
    if (reply.length === 0) return "";
    const rng = makeRng(hashString(`${this.seed}:${input}`));
    return reply[Math.floor(rng() * reply.length)] ?? "";
  }
}

function lastUserMessage(messages: readonly Message[]): string {
  for (const m of [...messages].reverse()) if (m.role === "user") return m.content;
  return "";
}

/** false = no match, true = matched with no capture groups, array = regex match. */
function matchRule(rule: Rule, input: string): boolean | RegExpMatchArray {
  const { match } = rule;
  if (typeof match === "string") return input.toLowerCase().includes(match.toLowerCase());
  if (typeof match === "function") return match(input);
  // Avoid state leaking between calls when a rule uses the g or y flag.
  const re = new RegExp(match.source, match.flags.replace(/[gy]/g, ""));
  return input.match(re) ?? false;
}
