import { describe, expect, it } from "vitest";
import { wrapTitle } from "./wrap";

describe("wrapTitle", () => {
  it("keeps a short title on one line", () => {
    expect(wrapTitle("Gradient descent")).toEqual(["Gradient descent"]);
  });

  it("breaks at a space, never mid-word", () => {
    expect(wrapTitle("Optimizers: momentum, Adam, AdamW", 22)).toEqual(["Optimizers: momentum,", "Adam, AdamW"]);
    // Too tight for the first two words together: it breaks earlier rather than overflow.
    expect(wrapTitle("Optimizers: momentum, Adam, AdamW", 20)[0]).toBe("Optimizers:");
  });

  it("every line fits when words are short enough", () => {
    for (const line of wrapTitle("Retrieval-augmented generation for everyone", 22)) expect(line.length).toBeLessThanOrEqual(22);
  });

  it("truncates with an ellipsis past the line limit and never invents text", () => {
    const lines = wrapTitle("one two three four five six seven eight nine ten eleven twelve", 10, 2);
    expect(lines).toHaveLength(2);
    expect(lines[1]!.endsWith("...")).toBe(true);
  });

  it("handles one very long word and extra spaces", () => {
    expect(wrapTitle("Supercalifragilisticexpialidocious", 10)).toEqual(["Supercalifragilisticexpialidocious"]);
    expect(wrapTitle("  a   b  ")).toEqual(["a b"]);
  });
});
