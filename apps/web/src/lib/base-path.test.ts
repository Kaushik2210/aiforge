import { describe, expect, it } from "vitest";
import { withBase } from "./base-path";

describe("withBase", () => {
  it("adds the base path to root-relative paths", () => {
    expect(withBase("/quests/a/", "/aiforge")).toBe("/aiforge/quests/a/");
    expect(withBase("/pyodide/", "/aiforge")).toBe("/aiforge/pyodide/");
  });
  it("does nothing at the domain root", () => {
    expect(withBase("/quests/a/", "")).toBe("/quests/a/");
  });
  it("leaves external, protocol-relative, hash and relative URLs alone", () => {
    for (const u of ["https://example.com/x", "//cdn.example.com/x", "#main", "mailto:a@b.c", "x/y"]) {
      expect(withBase(u, "/aiforge")).toBe(u);
    }
  });
});
