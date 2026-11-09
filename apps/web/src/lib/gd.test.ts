import { describe, expect, it } from "vitest";
import { factor, iterates, verdict } from "./gd";

describe("gradient descent on x^2", () => {
  it("matches the worked numbers in the lesson", () => {
    expect(iterates(10, 0.2, 10).at(-1)).toBeCloseTo(0.0604661760, 8);
    expect(iterates(10, 0.05, 10).at(-1)).toBeCloseTo(3.486784401, 8);
    expect(iterates(10, 1.1, 10).at(-1)).toBeCloseTo(61.917364224, 6);
  });

  it("returns steps + 1 points starting at x0", () => {
    const xs = iterates(3, 0.1, 5);
    expect(xs).toHaveLength(6);
    expect(xs[0]).toBe(3);
  });

  it("lr = 1 bounces between 10 and -10", () => {
    expect(iterates(10, 1, 4)).toEqual([10, -10, 10, -10, 10]);
  });

  it("factor is 1 - 2*lr", () => {
    expect(factor(0.2)).toBeCloseTo(0.6);
    expect(factor(1.1)).toBeCloseTo(-1.2);
  });

  it("classifies behaviour", () => {
    expect(verdict(0.2)).toBe("converging");
    expect(verdict(0.75)).toBe("oscillating"); // factor -0.5: bounces yet converges
    expect(verdict(1)).toBe("oscillating");
    expect(verdict(1.1)).toBe("diverging");
    expect(verdict(0)).toBe("stuck");
  });
});
