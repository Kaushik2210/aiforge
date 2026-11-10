/**
 * One original biome per realm. Names and looks are invented for AIForge; no
 * art, names or maps are taken from any existing game or anime.
 */

export type DecorKind = "hills" | "water" | "trees" | "crystals" | "towers" | "clouds";

export interface Biome {
  realm: number;
  name: string;
  kind: DecorKind;
  /** 0 = tinted with the theme accent, 1 = tinted with the theme primary. */
  tint: number;
}

export const BIOMES: readonly Biome[] = [
  { realm: 1, name: "Terminal Foothills", kind: "hills", tint: 0.1 },
  { realm: 2, name: "Loss Mountains", kind: "hills", tint: 0.8 },
  { realm: 3, name: "Data Canals", kind: "water", tint: 0.2 },
  { realm: 4, name: "Neuron Forest", kind: "trees", tint: 0.3 },
  { realm: 5, name: "Tensor Forge", kind: "crystals", tint: 0.9 },
  { realm: 6, name: "Token Bazaar", kind: "towers", tint: 0.6 },
  { realm: 7, name: "API Harbor", kind: "water", tint: 0.1 },
  { realm: 8, name: "Prompt Spires", kind: "towers", tint: 0.5 },
  { realm: 9, name: "Vector Galaxy", kind: "crystals", tint: 0.35 },
  { realm: 10, name: "Retrieval Library", kind: "towers", tint: 0.7 },
  { realm: 11, name: "Agent Arena", kind: "hills", tint: 0.95 },
  { realm: 12, name: "Framework Tavern", kind: "trees", tint: 0.55 },
  { realm: 13, name: "Adapter Workshop", kind: "crystals", tint: 0.65 },
  { realm: 14, name: "Sense Gardens", kind: "trees", tint: 0.4 },
  { realm: 15, name: "Courthouse of Evals", kind: "towers", tint: 0.25 },
  { realm: 16, name: "Cache Caverns", kind: "crystals", tint: 0.15 },
  { realm: 17, name: "Queue Factory", kind: "towers", tint: 0.75 },
  { realm: 18, name: "Trace Observatory", kind: "clouds", tint: 0.3 },
  { realm: 19, name: "Container Harbor", kind: "water", tint: 0.5 },
  { realm: 20, name: "Shield Citadel", kind: "towers", tint: 0.85 },
  { realm: 21, name: "Blueprint Plateau", kind: "hills", tint: 0.45 },
  { realm: 22, name: "Guild Hall", kind: "trees", tint: 0.6 },
  { realm: 23, name: "Summit of Production", kind: "clouds", tint: 0.9 },
];

export function biomeFor(realm: number): Biome {
  const b = BIOMES[realm - 1];
  if (!b) throw new RangeError(`no biome for realm ${realm}`);
  return b;
}

/* ------------------------------------------------------------------ colour */

const clamp01 = (n: number) => Math.min(1, Math.max(0, n));

/** "#rrggbb" to a 24-bit number. */
export function hexToNumber(hex: string): number {
  const m = /^#?([0-9a-fA-F]{6})$/.exec(hex.trim());
  if (!m) throw new RangeError(`not a #rrggbb colour: ${hex}`);
  return parseInt(m[1]!, 16);
}

/** Blend two 24-bit colours; t = 0 gives a, t = 1 gives b. */
export function mixColor(a: number, b: number, t: number): number {
  const k = clamp01(t);
  const ch = (shift: number) => {
    const av = (a >> shift) & 255;
    const bv = (b >> shift) & 255;
    return Math.round(av + (bv - av) * k) & 255;
  };
  return (ch(16) << 16) | (ch(8) << 8) | ch(0);
}

export interface MapTheme {
  bg: number;
  surface: number;
  surface2: number;
  text: number;
  textMuted: number;
  border: number;
  primary: number;
  onPrimary: number;
  accent: number;
  xp: number;
}

/** Band colour for a biome: the page background nudged toward its tint. */
export function biomeColor(theme: MapTheme, biome: Biome, strength = 0.28): number {
  return mixColor(theme.bg, mixColor(theme.accent, theme.primary, biome.tint), strength);
}
