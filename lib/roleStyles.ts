import type { Role } from "@/lib/roles";

/** Solid role colours, for badges on a surface background. */
export const ROLE_BADGE_BG: Record<Role, string> = {
  P: "bg-role-p",
  D: "bg-role-d",
  C: "bg-role-c",
  A: "bg-role-a",
};

/** Soft role colours, for pills and chips below the role limit. */
export const ROLE_PILL_BG: Record<Role, string> = {
  P: "bg-role-p-soft text-role-p",
  D: "bg-role-d-soft text-role-d",
  C: "bg-role-c-soft text-role-c",
  A: "bg-role-a-soft text-role-a",
};

/** Filled role colours, for a pill whose role has reached its limit. */
export const ROLE_PILL_FULL: Record<Role, string> = {
  P: "bg-role-p text-white",
  D: "bg-role-d text-white",
  C: "bg-role-c text-white",
  A: "bg-role-a text-white",
};

/** An active role filter chip. */
export const ROLE_CHIP_ON: Record<Role, string> = {
  P: "border-role-p bg-role-p-soft text-role-p",
  D: "border-role-d bg-role-d-soft text-role-d",
  C: "border-role-c bg-role-c-soft text-role-c",
  A: "border-role-a bg-role-a-soft text-role-a",
};

/**
 * A roster pill flips from soft to filled once the role is full. It is the
 * only signal that a slot is closed, so it has to read peripherally during a
 * live auction — hence a fill change rather than a border or an icon.
 */
export function rolePillClass(role: Role, count: number, limit: number): string {
  return count >= limit ? ROLE_PILL_FULL[role] : ROLE_PILL_BG[role];
}
