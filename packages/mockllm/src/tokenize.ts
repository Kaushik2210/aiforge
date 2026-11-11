/**
 * A deliberately simple tokenizer: lowercase words and single punctuation marks.
 * Real LLMs use subword tokenizers (BPE and friends); this one only exists so the
 * mock can count and truncate. Token counts here are NOT comparable to a real model's.
 */
export function tokenize(text: string): string[] {
  return text.toLowerCase().match(/[\p{L}\p{N}_']+|[^\s\p{L}\p{N}_']/gu) ?? [];
}

/** Split into word-and-whitespace chunks for streaming, keeping the original text intact when joined. */
export function chunkForStreaming(text: string): string[] {
  return text.match(/\S+\s*|\s+/g) ?? [];
}
