export const ROLE_ORDER = ["P", "D", "C", "A"] as const;
export type Role = (typeof ROLE_ORDER)[number];

export const ROLE_LABELS: Record<Role, string> = {
  P: "Portieri",
  D: "Difensori",
  C: "Centrocampisti",
  A: "Attaccanti",
};

export function isValidRole(value: string): value is Role {
  return (ROLE_ORDER as readonly string[]).includes(value);
}

export function parseRoleParam(value?: string | null): Role[] {
  if (!value) return [];
  return value.split(",").filter(isValidRole);
}
