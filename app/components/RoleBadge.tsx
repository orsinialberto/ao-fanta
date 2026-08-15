import { isValidRole } from "@/lib/roles";
import { ROLE_BADGE_BG } from "@/lib/roleStyles";

const SIZES = {
  sm: "h-5 w-5 rounded-sm text-small-dense",
  md: "h-6 w-6 rounded-sm text-small",
  lg: "h-8 w-8 rounded-md text-body",
} as const;

export default function RoleBadge({
  role,
  size = "md",
}: {
  role: string;
  size?: keyof typeof SIZES;
}) {
  const bg = isValidRole(role) ? ROLE_BADGE_BG[role] : "bg-ink-3";

  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center font-mono font-semibold text-white ${SIZES[size]} ${bg}`}
    >
      {role}
    </span>
  );
}
