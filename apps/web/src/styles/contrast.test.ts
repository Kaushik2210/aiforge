import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const css = fs.readFileSync(path.resolve(__dirname, "globals.css"), "utf8");

function tokens(block: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const m of block.matchAll(/--c-([a-z0-9-]+):\s*(#[0-9a-fA-F]{6})/g)) {
    out[m[1]!] = m[2]!;
  }
  return out;
}

// Light theme lives in :root; dark values are the explicit [data-theme="dark"] block.
const light = tokens(css.slice(0, css.indexOf("@media (prefers-color-scheme: dark)")));
const darkBlock = css.slice(css.indexOf(':root[data-theme="dark"]'), css.indexOf("@theme inline"));
const dark = { ...light, ...tokens(darkBlock) };

function lum(hex: string): number {
  const c = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
  const [r, g, b] = c.map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4)) as [number, number, number];
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
function ratio(a: string, b: string): number {
  const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x) as [number, number];
  return (hi + 0.05) / (lo + 0.05);
}

const TEXT_PAIRS: [string, string][] = [
  ["text", "bg"],
  ["text", "surface"],
  ["text", "surface-2"],
  ["text-muted", "bg"],
  ["text-muted", "surface"],
  ["text-muted", "surface-2"],
  ["primary", "bg"],
  ["primary", "surface"],
  ["on-primary", "primary"],
  ["on-xp", "xp"],
  ["accent", "bg"],
  ["accent", "surface"],
  ["success", "surface"],
  ["danger", "surface"],
  ["success", "surface-2"],
  ["danger", "surface-2"],
];
const UI_PAIRS: [string, string][] = [
  ["focus", "bg"],
  ["focus", "surface"],
  ["border", "bg"],
  ["border", "surface"],
  ["primary", "bg"],
];

describe.each([
  ["light", light],
  ["dark", dark],
] as const)("%s theme contrast", (_name, t) => {
  it.each(TEXT_PAIRS)("%s on %s meets 4.5:1", (fg, bg) => {
    expect(ratio(t[fg]!, t[bg]!)).toBeGreaterThanOrEqual(4.5);
  });
  it.each(UI_PAIRS)("%s vs %s meets 3:1", (fg, bg) => {
    expect(ratio(t[fg]!, t[bg]!)).toBeGreaterThanOrEqual(3);
  });
});
