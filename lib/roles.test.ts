import { describe, it, expect } from "vitest";
import { parseRoleParam, isValidRole } from "@/lib/roles";

describe("parseRoleParam", () => {
  it("returns an empty array for null/undefined", () => {
    expect(parseRoleParam(null)).toEqual([]);
    expect(parseRoleParam(undefined)).toEqual([]);
  });

  it("splits a comma-separated list into valid roles", () => {
    expect(parseRoleParam("A,C")).toEqual(["A", "C"]);
  });

  it("drops invalid entries", () => {
    expect(parseRoleParam("A,X,D")).toEqual(["A", "D"]);
  });
});

describe("isValidRole", () => {
  it("accepts P/D/C/A", () => {
    expect(isValidRole("A")).toBe(true);
  });
  it("rejects anything else", () => {
    expect(isValidRole("X")).toBe(false);
  });
});
