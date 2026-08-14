/**
 * Normalizes a string for accent-insensitive comparison: strips diacritics
 * and lowercases. SQLite's `LIKE` (used by Prisma's `contains`) folds ASCII
 * case but not diacritics, so "Vlahovic" would not match "Vlahović" without
 * this — comparisons must happen in JS instead.
 */
export function normalize(s: string): string {
  return s
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase();
}
