import { describe, expect, it } from "vitest";
import { asciiRule, asciiSparkline, renderRealmMap, rainFrame, rng, scrambleFrame, skylineFrame, typedPrefix } from "./ascii-fx";

describe("scrambleFrame", () => {
  it("is the target at the end, noise-free", () => {
    expect(scrambleFrame("Level up", 1)).toBe("Level up");
    expect(scrambleFrame("Level up", 5)).toBe("Level up");
  });
  it("keeps length and spaces, and settles left to right", () => {
    const f = scrambleFrame("Level up now", 0.5, 3);
    expect(f).toHaveLength(12);
    expect(f[5]).toBe(" ");
    expect(f.slice(0, 6)).toBe("Level ");
  });
  it("survives bad progress", () => {
    expect(scrambleFrame("ab", Number.NaN)).toHaveLength(2);
    expect(scrambleFrame("ab", -3)).toHaveLength(2);
  });
  it("is deterministic", () => {
    expect(scrambleFrame("hello world", 0.3, 9)).toBe(scrambleFrame("hello world", 0.3, 9));
  });
});

describe("rainFrame", () => {
  it("has the requested size and is deterministic", () => {
    const a = rainFrame(30, 10, 2.5);
    expect(a).toHaveLength(10);
    for (const row of a) expect(row).toHaveLength(30);
    expect(a).toEqual(rainFrame(30, 10, 2.5));
  });
  it("moves with time and never draws outside the grid", () => {
    expect(rainFrame(30, 10, 0)).not.toEqual(rainFrame(30, 10, 3));
    expect(rainFrame(0, 0, 1)).toHaveLength(1);
  });
});

describe("skylineFrame", () => {
  it("has equal-length rows, a sun and ground", () => {
    const rows = skylineFrame(60, 16, 0);
    expect(rows).toHaveLength(16);
    for (const row of rows) expect(row).toHaveLength(60);
    expect(rows.join("")).toContain("O");
    expect(rows.at(-1)!).toContain("#");
  });
  it("drifts over time", () => {
    expect(skylineFrame(60, 16, 0)).not.toEqual(skylineFrame(60, 16, 5));
  });
});

describe("rng", () => {
  it("is in [0, 1) and repeatable", () => {
    const a = rng(5);
    const b = rng(5);
    for (let i = 0; i < 20; i++) {
      const v = a();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
      expect(v).toBe(b());
    }
  });
});

describe("typedPrefix", () => {
  it("types from nothing to everything", () => {
    expect(typedPrefix("forge", 0)).toBe("");
    expect(typedPrefix("forge", 0.5)).toBe("fo");
    expect(typedPrefix("forge", 1)).toBe("forge");
    expect(typedPrefix("forge", 9)).toBe("forge");
    expect(typedPrefix("forge", Number.NaN)).toBe("");
  });
});

describe("asciiRule", () => {
  it("is exactly the width, with the label centred, and survives tiny widths", () => {
    for (const w of [10, 24, 61]) {
      expect(asciiRule(w)).toHaveLength(w);
      expect(asciiRule(w, "forge")).toHaveLength(w >= 15 ? w : asciiRule(w).length);
    }
    expect(asciiRule(30, "forge")).toContain("[ forge ]");
    expect(asciiRule(0)).toHaveLength(4);
  });
});

describe("asciiSparkline", () => {
  it("is one character per value, scaled to the largest, with gaps for unknown days", () => {
    const line = asciiSparkline([0, 5, 10, null, 10]);
    expect(line).toHaveLength(5);
    expect(line[0]).toBe("._-=+*#@"[0]);
    expect(line[2]).toBe("@");
    expect(line[3]).toBe(" ");
  });
  it("keeps all-zero and empty input on the floor and survives bad numbers", () => {
    expect(asciiSparkline([0, 0, 0])).toBe("...");
    expect(asciiSparkline([])).toBe("");
    expect(asciiSparkline([Number.NaN, 3])).toHaveLength(2);
  });
  it("is never lower for a higher value", () => {
    const ramp = "._-=+*#@";
    let last = -1;
    for (let v = 0; v <= 100; v += 3) {
      const i = ramp.indexOf(asciiSparkline([v, 100])[0]!);
      expect(i).toBeGreaterThanOrEqual(last);
      last = i;
    }
  });
});

describe("renderRealmMap", () => {
  const realms = [
    { n: 1, name: "Programming", open: false },
    { n: 2, name: "Maths", open: true },
    { n: 3, name: "A very long realm name that goes on and on and on forever and ever", open: false },
  ];
  it("draws one tag per realm with the open one starred, joined by a path", () => {
    const rows = renderRealmMap(realms);
    expect(rows.join("|")).toContain("[ 01] Programming");
    expect(rows.join("|")).toContain("[*02] Maths");
    expect(rows).toHaveLength(5);
    expect(rows[1]).toContain("|");
  });
  it("never goes wider than the width", () => {
    for (const row of renderRealmMap(realms, 40)) expect(row.length).toBeLessThanOrEqual(40);
  });
});
