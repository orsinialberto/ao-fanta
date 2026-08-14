export function evaluateRoleLimit(
  count: number,
  limit: number,
  roleLabel: string
): { ok: boolean; error?: string } {
  if (count >= limit) {
    return { ok: false, error: `Limite raggiunto per ruolo ${roleLabel} (${limit}/${limit})` };
  }
  return { ok: true };
}
