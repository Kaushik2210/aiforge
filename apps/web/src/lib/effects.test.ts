import { describe, expect, it } from "vitest";
import { DEFAULT_FX_LEVEL, FX_CHOICES, cutInDuration, parseFxLevel } from "./effects";

describe("parseFxLevel", () => {
  it("accepts the four levels as text or numbers", () => {
    for (const n of [0, 1, 2, 3] as const) {
      expect(parseFxLevel(String(n))).toBe(n);
      expect(parseFxLevel(n)).toBe(n);
    }
  });
  it("falls back to the default for anything else", () => {
    for (const bad of [undefined, null, "", "4", "-1", "high", "2.5", NaN, {}, []]) {
      expect(parseFxLevel(bad)).toBe(DEFAULT_FX_LEVEL);
    }
  });
});

describe("choices and durations", () => {
  it("lists each level once, in order, with a name", () => {
    expect(FX_CHOICES.map((c) => c.level)).toEqual([0, 1, 2, 3]);
    expect(new Set(FX_CHOICES.map((c) => c.name)).size).toBe(4);
  });
  it("shows no banner when off and longer ones at higher levels", () => {
    expect(cutInDuration(0)).toBe(0);
    expect(cutInDuration(1)).toBeLessThan(cutInDuration(2));
    expect(cutInDuration(2)).toBeLessThan(cutInDuration(3));
  });
});
