import { describe, it, expect } from "vitest";
import {
  TIER_ORDER,
  TIER_LABELS,
  isValidTier,
  parseTierParam,
  groupByTier,
  tierSortWeight,
} from "@/lib/wishlist";

describe("TIER_ORDER / TIER_LABELS", () => {
  it("lists the tiers from most to least important", () => {
    expect(TIER_ORDER).toEqual(["A", "B", "C"]);
  });

  it("has an Italian label for every tier", () => {
    expect(TIER_LABELS).toEqual({ A: "Big", B: "Medi", C: "Low cost" });
  });
});

describe("isValidTier", () => {
  it("accepts A/B/C", () => {
    expect(isValidTier("A")).toBe(true);
    expect(isValidTier("C")).toBe(true);
  });

  it("rejects anything else, including lowercase", () => {
    expect(isValidTier("D")).toBe(false);
    expect(isValidTier("a")).toBe(false);
    expect(isValidTier("")).toBe(false);
  });
});

describe("parseTierParam", () => {
  it("returns an empty array for null/undefined", () => {
    expect(parseTierParam(null)).toEqual([]);
    expect(parseTierParam(undefined)).toEqual([]);
  });

  it("splits a comma-separated list into valid tiers", () => {
    expect(parseTierParam("A,C")).toEqual(["A", "C"]);
  });

  it("drops invalid entries", () => {
    expect(parseTierParam("A,X,B")).toEqual(["A", "B"]);
  });
});

describe("groupByTier", () => {
  it("always returns all three keys, even when empty", () => {
    expect(groupByTier([])).toEqual({ A: [], B: [], C: [] });
  });

  it("files each player under its tier, preserving input order", () => {
    const players = [
      { id: "1", wishlistTier: "B" },
      { id: "2", wishlistTier: "A" },
      { id: "3", wishlistTier: "B" },
    ];
    const groups = groupByTier(players);
    expect(groups.A.map((p) => p.id)).toEqual(["2"]);
    expect(groups.B.map((p) => p.id)).toEqual(["1", "3"]);
    expect(groups.C).toEqual([]);
  });

  it("ignores players with no tier or an unknown tier", () => {
    const groups = groupByTier([
      { id: "1", wishlistTier: null },
      { id: "2", wishlistTier: "Z" },
    ]);
    expect(groups).toEqual({ A: [], B: [], C: [] });
  });
});

describe("tierSortWeight", () => {
  it("orders A before B before C", () => {
    expect(tierSortWeight("A")).toBeLessThan(tierSortWeight("B"));
    expect(tierSortWeight("B")).toBeLessThan(tierSortWeight("C"));
  });

  it("sinks players with no tier below every tier", () => {
    expect(tierSortWeight(null)).toBeGreaterThan(tierSortWeight("C"));
  });

  it("treats an unknown tier like no tier", () => {
    expect(tierSortWeight("Z")).toBe(tierSortWeight(null));
  });
});
