/**
 * Percentage of `total` represented by `spent`, as an integer 0-100.
 *
 * Callers use the result directly as a CSS width, so the clamping matters:
 * a team can be overspent (cost is not validated against remaining credits,
 * only warned about in AssignDialog), and a league can exist with zero teams
 * or zero credits. Neither may produce a bar that overflows or inverts.
 */
export function spendPercent(spent: number, total: number): number {
  if (total <= 0) return 0;
  const pct = Math.round((spent / total) * 100);
  return Math.min(100, Math.max(0, pct));
}
