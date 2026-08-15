import { describe, it, expect } from "vitest";
import { spendPercent } from "@/lib/credits";

describe("spendPercent", () => {
  it("returns the rounded percentage of the total", () => {
    expect(spendPercent(118, 500)).toBe(24);
  });

  it("returns 0 when the total is zero", () => {
    expect(spendPercent(0, 0)).toBe(0);
  });

  it("returns 0 for a negative total rather than a negative width", () => {
    expect(spendPercent(10, -5)).toBe(0);
  });

  it("clamps above 100 so an overspent team cannot overflow its bar", () => {
    expect(spendPercent(600, 500)).toBe(100);
  });

  it("clamps below 0", () => {
    expect(spendPercent(-20, 500)).toBe(0);
  });
});
