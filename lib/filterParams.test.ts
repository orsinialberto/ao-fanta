import { describe, it, expect } from "vitest";
import {
  readFilterState,
  readSearchParams,
  writeFilterState,
  toggleRole,
  toggleTier,
  activeFilterCount,
  EMPTY_FILTER_STATE,
} from "@/lib/filterParams";

describe("readFilterState", () => {
  it("returns the empty state for an empty query string", () => {
    expect(readFilterState(new URLSearchParams())).toEqual(EMPTY_FILTER_STATE);
  });

  it("reads every field", () => {
    const params = new URLSearchParams(
      "search=lauta&role=A,C&serieATeam=Inter&freeAgentOnly=true&starterOnly=true&watchlistOnly=true"
    );
    expect(readFilterState(params)).toEqual({
      search: "lauta",
      role: ["A", "C"],
      serieATeam: "Inter",
      freeAgentOnly: true,
      starterOnly: true,
      watchlistOnly: true,
      wishlistTier: [],
    });
  });

  it("drops invalid roles", () => {
    expect(readFilterState(new URLSearchParams("role=A,X,D")).role).toEqual(["A", "D"]);
  });

  it("treats any value other than 'true' as false", () => {
    expect(readFilterState(new URLSearchParams("freeAgentOnly=1")).freeAgentOnly).toBe(false);
  });
});

describe("readSearchParams", () => {
  it("reads Next's searchParams shape", () => {
    expect(readSearchParams({ role: "A,C", serieATeam: "Inter" })).toEqual({
      ...EMPTY_FILTER_STATE,
      role: ["A", "C"],
      serieATeam: "Inter",
    });
  });

  it("drops undefined values instead of stringifying them", () => {
    // URLSearchParams would turn `{ search: undefined }` into "search=undefined",
    // which then filters the player list by the literal text "undefined".
    expect(readSearchParams({ search: undefined }).search).toBe("");
  });
});

describe("writeFilterState", () => {
  it("omits empty and false fields so the URL stays clean", () => {
    expect(writeFilterState(EMPTY_FILTER_STATE)).toBe("");
  });

  it("serialises roles as a comma-separated list", () => {
    expect(writeFilterState({ ...EMPTY_FILTER_STATE, role: ["A", "C"] })).toBe("role=A%2CC");
  });

  it("round-trips through readFilterState", () => {
    const state = {
      search: "lauta",
      role: ["A", "C"] as const,
      serieATeam: "Inter",
      freeAgentOnly: true,
      starterOnly: false,
      watchlistOnly: true,
      wishlistTier: [],
    };
    expect(readFilterState(new URLSearchParams(writeFilterState({ ...state, role: [...state.role] })))).toEqual({
      ...state,
      role: [...state.role],
    });
  });
});

describe("toggleRole", () => {
  it("adds a role that is not selected", () => {
    expect(toggleRole(["A"], "C")).toEqual(["A", "C"]);
  });

  it("removes a role that is selected", () => {
    expect(toggleRole(["A", "C"], "A")).toEqual(["C"]);
  });
});

describe("activeFilterCount", () => {
  it("is 0 for the empty state", () => {
    expect(activeFilterCount(EMPTY_FILTER_STATE)).toBe(0);
  });

  it("counts each selected role separately", () => {
    expect(activeFilterCount({ ...EMPTY_FILTER_STATE, role: ["A", "C"] })).toBe(2);
  });

  it("counts a team and each active toggle", () => {
    expect(
      activeFilterCount({
        ...EMPTY_FILTER_STATE,
        serieATeam: "Inter",
        freeAgentOnly: true,
        watchlistOnly: true,
      })
    ).toBe(3);
  });

  it("ignores search, which has its own visible input", () => {
    expect(activeFilterCount({ ...EMPTY_FILTER_STATE, search: "lauta" })).toBe(0);
  });
});

describe("wishlistTier filtering", () => {
  it("reads a comma-separated tier list from the query string", () => {
    expect(readFilterState(new URLSearchParams("wishlistTier=A,C")).wishlistTier).toEqual([
      "A",
      "C",
    ]);
  });

  it("drops invalid tiers", () => {
    expect(readFilterState(new URLSearchParams("wishlistTier=A,X,B")).wishlistTier).toEqual([
      "A",
      "B",
    ]);
  });

  it("defaults to an empty selection", () => {
    expect(EMPTY_FILTER_STATE.wishlistTier).toEqual([]);
  });

  it("serialises tiers as a comma-separated list", () => {
    expect(writeFilterState({ ...EMPTY_FILTER_STATE, wishlistTier: ["A", "C"] })).toBe(
      "wishlistTier=A%2CC"
    );
  });

  it("round-trips through readFilterState", () => {
    const state = { ...EMPTY_FILTER_STATE, search: "lauta", wishlistTier: ["B" as const] };
    expect(readFilterState(new URLSearchParams(writeFilterState(state)))).toEqual(state);
  });

  it("counts each selected tier as its own active filter", () => {
    expect(activeFilterCount({ ...EMPTY_FILTER_STATE, wishlistTier: ["A", "B"] })).toBe(2);
  });
});

describe("toggleTier", () => {
  it("adds a tier that is not selected", () => {
    expect(toggleTier(["A"], "C")).toEqual(["A", "C"]);
  });

  it("removes a tier that is selected", () => {
    expect(toggleTier(["A", "C"], "A")).toEqual(["C"]);
  });
});
