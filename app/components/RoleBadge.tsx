import { isValidRole } from "@/lib/roles";
import { ROLE_BADGE_BG } from "@/lib/roleStyles";

const SIZES = {
  sm: "h-[22px] w-[22px] rounded-md text-[9.5px]",
  md: "h-[26px] w-[26px] rounded-lg text-[11px]",
  lg: "h-[34px] w-[34px] rounded-[10px] text-[13px]",
} as const;

export default function RoleBadge({
  role,
  size = "md",
}: {
  role: string;
  size?: keyof typeof SIZES;
}) {
  const bg = isValidRole(role) ? ROLE_BADGE_BG[role] : "bg-ink-dim";

  return (
    <span
      className={`inline-flex flex-shrink-0 items-center justify-center font-extrabold text-white ${SIZES[size]} ${bg}`}
    >
      {role}
    </span>
  );
}
