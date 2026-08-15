import { describe, it, expect } from "vitest";
import { matchStarters } from "@/lib/starters";

describe("matchStarters", () => {
  it("matches an exact name", () => {
    const players = [{ id: "1", name: "Osimhen" }];
    const result = matchStarters(["Osimhen"], players);
    expect(result.matchedIds).toEqual(["1"]);
    expect(result.unmatchedNames).toEqual([]);
  });

  it("matches accent/case-insensitively", () => {
    const players = [{ id: "1", name: "Vlahović" }];
    const result = matchStarters(["vlahovic"], players);
    expect(result.matchedIds).toEqual(["1"]);
    expect(result.unmatchedNames).toEqual([]);
  });

  it("reports a name with no matching player", () => {
    const players = [{ id: "1", name: "Osimhen" }];
    const result = matchStarters(["Lukaku"], players);
    expect(result.matchedIds).toEqual([]);
    expect(result.unmatchedNames).toEqual(["Lukaku"]);
  });

  it("dedupes a name repeated in the input list", () => {
    const players = [{ id: "1", name: "Osimhen" }];
    const result = matchStarters(["Osimhen", "Osimhen"], players);
    expect(result.matchedIds).toEqual(["1"]);
  });

  it("matches the first player when two normalize to the same name", () => {
    const players = [
      { id: "1", name: "Osimhen" },
      { id: "2", name: "osimhen" },
    ];
    const result = matchStarters(["Osimhen"], players);
    expect(result.matchedIds).toEqual(["1"]);
  });

  it("returns empty results for an empty name list", () => {
    const players = [{ id: "1", name: "Osimhen" }];
    const result = matchStarters([], players);
    expect(result.matchedIds).toEqual([]);
    expect(result.unmatchedNames).toEqual([]);
  });
});
