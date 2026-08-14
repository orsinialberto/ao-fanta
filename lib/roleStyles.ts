import type { Role } from "@/lib/roles";

/** Solid role colours, for badges on a surface background. */
export const ROLE_BADGE_BG: Record<Role, string> = {
  P: "bg-teal",
  D: "bg-indigo",
  C: "bg-amber",
  A: "bg-coral",
};

/** Soft role colours, for pills and chips. */
export const ROLE_PILL_BG: Record<Role, string> = {
  P: "bg-teal-soft text-teal",
  D: "bg-indigo-soft text-indigo",
  C: "bg-amber-soft text-amber",
  A: "bg-coral-soft text-coral",
};
