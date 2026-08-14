"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { ROLE_ORDER, parseRoleParam, type Role } from "@/lib/roles";

const ROLE_CHIP_ON: Record<Role, string> = {
  P: "border-teal bg-teal-soft text-teal",
  D: "border-indigo bg-indigo-soft text-indigo",
  C: "border-amber bg-amber-soft text-amber",
  A: "border-coral bg-coral-soft text-coral",
};

export default function RoleFilter() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const activeRoles = parseRoleParam(searchParams.get("role"));

  function toggleRole(role: Role) {
    const next = activeRoles.includes(role)
      ? activeRoles.filter((r) => r !== role)
      : [...activeRoles, role];
    const params = new URLSearchParams(searchParams.toString());
    if (next.length > 0) params.set("role", next.join(","));
    else params.delete("role");
    router.replace(`${pathname}?${params.toString()}`);
  }

  return (
    <div className="flex items-center gap-1.5">
      {ROLE_ORDER.map((role) => (
        <button
          key={role}
          onClick={() => toggleRole(role)}
          className={`rounded-lg border-[1.5px] px-3 py-1.5 text-[12px] font-extrabold ${
            activeRoles.includes(role) ? ROLE_CHIP_ON[role] : "border-border text-ink-dim"
          }`}
        >
          {role}
        </button>
      ))}
    </div>
  );
}
