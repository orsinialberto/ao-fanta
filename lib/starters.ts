import { normalize } from "@/lib/normalize";

/**
 * Matches a list of names (e.g. pasted/uploaded by the user) against
 * existing players by normalized name. Pure and DB-free so it's
 * unit-testable in isolation — mirrors the `computeReconcile` pattern in
 * lib/importReconcile.ts.
 */
export function matchStarters(
  names: string[],
  players: { id: string; name: string }[]
): { matchedIds: string[]; unmatchedNames: string[] } {
  const byNormalizedName = new Map<string, string>();
  for (const p of players) {
    const key = normalize(p.name);
    if (!byNormalizedName.has(key)) byNormalizedName.set(key, p.id);
  }

  const matchedIds = new Set<string>();
  const unmatchedNames: string[] = [];

  for (const name of names) {
    const id = byNormalizedName.get(normalize(name));
    if (id) {
      matchedIds.add(id);
    } else {
      unmatchedNames.push(name);
    }
  }

  return { matchedIds: [...matchedIds], unmatchedNames };
}
