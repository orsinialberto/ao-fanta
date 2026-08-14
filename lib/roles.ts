export const ROLE_ORDER = ["P", "D", "C", "A"] as const;
export type Role = (typeof ROLE_ORDER)[number];

export const ROLE_LABELS: Record<Role, string> = {
  P: "Portieri",
  D: "Difensori",
  C: "Centrocampisti",
  A: "Attaccanti",
};

export const ROLE_LIMITS: Record<Role, number> = {
  P: 3,
  D: 8,
  C: 8,
  A: 6,
};

export function isValidRole(value: string): value is Role {
  return (ROLE_ORDER as readonly string[]).includes(value);
}
