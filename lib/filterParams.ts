import { parseRoleParam, type Role } from "@/lib/roles";
import { parseTierParam, type WishlistTier } from "@/lib/wishlist";

export type PlayerFilterState = {
  search: string;
  role: Role[];
  serieATeam: string;
  freeAgentOnly: boolean;
  starterOnly: boolean;
  wishlistTier: WishlistTier[];
};

/** Filters with everything, including freeAgentOnly, explicitly turned off. */
export const EMPTY_FILTER_STATE: PlayerFilterState = {
  search: "",
  role: [],
  serieATeam: "",
  freeAgentOnly: false,
  starterOnly: false,
  wishlistTier: [],
};

/** What a fresh visit to the listone starts on: only free agents shown. */
export const DEFAULT_FILTER_STATE: PlayerFilterState = {
  ...EMPTY_FILTER_STATE,
  freeAgentOnly: true,
};

/** Boolean params are the string "true" or absent. Nothing else is truthy. */
const BOOLEAN_KEYS = ["freeAgentOnly", "starterOnly"] as const;

export function readFilterState(params: URLSearchParams): PlayerFilterState {
  return {
    search: params.get("search") ?? "",
    role: parseRoleParam(params.get("role")),
    serieATeam: params.get("serieATeam") ?? "",
    // Defaults to true when the URL says nothing at all, so a fresh visit to
    // the listone starts on free agents. Once the user explicitly toggles it
    // off, writeFilterState pins "false" in the URL so it stays off.
    freeAgentOnly: params.has("freeAgentOnly") ? params.get("freeAgentOnly") === "true" : true,
    starterOnly: params.get("starterOnly") === "true",
    wishlistTier: parseTierParam(params.get("wishlistTier")),
  };
}

/**
 * Serialises to a query string with empty and false fields omitted, so a
 * cleared filter panel produces a bare pathname rather than a trail of
 * `?role=&serieATeam=`. Key order is fixed to keep URLs stable across
 * renders (and the round-trip test meaningful).
 */
export function writeFilterState(state: PlayerFilterState): string {
  const params = new URLSearchParams();
  if (state.search) params.set("search", state.search);
  if (state.role.length > 0) params.set("role", state.role.join(","));
  if (state.serieATeam) params.set("serieATeam", state.serieATeam);
  if (state.wishlistTier.length > 0) params.set("wishlistTier", state.wishlistTier.join(","));
  // freeAgentOnly defaults to true when absent, so "off" must be written
  // explicitly or it would read back as the default "on".
  if (!state.freeAgentOnly) params.set("freeAgentOnly", "false");
  if (state.starterOnly) params.set("starterOnly", "true");
  return params.toString();
}

/**
 * Same as readFilterState, for the shape Next hands a page as `searchParams`.
 * Undefined values are dropped rather than passed to URLSearchParams, which
 * would stringify them into the literal "undefined".
 */
export function readSearchParams(
  params: Record<string, string | undefined>
): PlayerFilterState {
  const defined = Object.entries(params).filter(
    (entry): entry is [string, string] => entry[1] !== undefined
  );
  return readFilterState(new URLSearchParams(defined));
}

export function toggleRole(roles: Role[], role: Role): Role[] {
  return roles.includes(role) ? roles.filter((r) => r !== role) : [...roles, role];
}

export function toggleTier(tiers: WishlistTier[], tier: WishlistTier): WishlistTier[] {
  return tiers.includes(tier) ? tiers.filter((t) => t !== tier) : [...tiers, tier];
}

/**
 * How many filter chips to show. Search is excluded: it has its own always
 * visible input, so echoing it as a removable chip would be redundant.
 */
export function activeFilterCount(state: PlayerFilterState): number {
  return (
    state.role.length +
    state.wishlistTier.length +
    (state.serieATeam ? 1 : 0) +
    BOOLEAN_KEYS.filter((key) => state[key]).length
  );
}
