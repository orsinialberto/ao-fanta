export const TIER_ORDER = ["A", "B", "C"] as const;
export type WishlistTier = (typeof TIER_ORDER)[number];

/**
 * A is where the credits go, C is where the leftovers go. The labels are the
 * only place this ordering is spelled out for the user.
 */
export const TIER_LABELS: Record<WishlistTier, string> = {
  A: "Big",
  B: "Medi",
  C: "Low cost",
};

export function isValidTier(value: string): value is WishlistTier {
  return (TIER_ORDER as readonly string[]).includes(value);
}

export function parseTierParam(value?: string | null): WishlistTier[] {
  if (!value) return [];
  return value.split(",").filter(isValidTier);
}

/**
 * Always returns all three buckets so callers can render a stable set of
 * sections without checking for missing keys. Players with no tier (or a tier
 * the database somehow holds outside A/B/C) are dropped.
 */
export function groupByTier<T extends { wishlistTier: string | null }>(
  players: T[]
): Record<WishlistTier, T[]> {
  const groups: Record<WishlistTier, T[]> = { A: [], B: [], C: [] };
  for (const player of players) {
    if (player.wishlistTier && isValidTier(player.wishlistTier)) {
      groups[player.wishlistTier].push(player);
    }
  }
  return groups;
}

/** Sort weight for the listone column: A, B, C, then everything untiered. */
export function tierSortWeight(tier: string | null): number {
  if (!tier || !isValidTier(tier)) return TIER_ORDER.length + 1;
  return TIER_ORDER.indexOf(tier) + 1;
}
