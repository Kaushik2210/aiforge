/**
 * A deliberately simple tokenizer: lowercase words and single punctuation marks.
 * Real LLMs use subword tokenizers (BPE and friends); this one only exists so the
 * mock can count and truncate. Token counts here are NOT comparable to a real model's.
 */
export function tokenize(text: string): string[] {
  // \p{M} (combining marks) and ‍ (zero-width joiner) stay inside a word so "İstanbul" and emoji sequences are not split apart.
  return text.toLowerCase().match(/[\p{L}\p{N}\p{M}_'‍]+|[^\s\p{L}\p{N}\p{M}_'‍]/gu) ?? [];
}

/** Split into word-and-whitespace chunks for streaming, keeping the original text intact when joined. */
export function chunkForStreaming(text: string): string[] {
  return text.match(/\S+\s*|\s+/g) ?? [];
}
