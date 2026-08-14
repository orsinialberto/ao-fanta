"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { X } from "lucide-react";
import { ROLE_ORDER, parseRoleParam, type Role } from "@/lib/roles";

const ROLE_CHIP_ON: Record<Role, string> = {
  P: "border-teal bg-teal-soft text-teal",
  D: "border-indigo bg-indigo-soft text-indigo",
  C: "border-amber bg-amber-soft text-amber",
  A: "border-coral bg-coral-soft text-coral",
};

export default function FilterPanel({
  serieATeams,
  resultCount,
}: {
  serieATeams: string[];
  resultCount: number;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const activeRoles = parseRoleParam(searchParams.get("role"));
  const activeSerieATeam = searchParams.get("serieATeam") ?? "";
  const activeBooleans = (["freeAgentOnly", "starterOnly", "watchlistOnly"] as const).filter(
    (k) => searchParams.get(k) === "true"
  );
  const activeCount = activeRoles.length + (activeSerieATeam ? 1 : 0) + activeBooleans.length;

  function setParam(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set(key, value);
    else params.delete(key);
    router.replace(`${pathname}?${params.toString()}`);
  }

  function toggleRole(role: Role) {
    const next = activeRoles.includes(role)
      ? activeRoles.filter((r) => r !== role)
      : [...activeRoles, role];
    setParam("role", next.join(","));
  }

  function toggleBoolean(key: string) {
    setParam(key, searchParams.get(key) === "true" ? "" : "true");
  }

  function resetAll() {
    router.replace(pathname);
  }

  const BOOLEAN_LABELS: Record<string, string> = {
    freeAgentOnly: "Svincolati",
    starterOnly: "Titolari",
    watchlistOnly: "Wishlist",
  };

  return (
    <div className="w-full rounded-2xl border border-border bg-surface p-4 shadow-sm">
      <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
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

        <select
          value={activeSerieATeam}
          onChange={(e) => setParam("serieATeam", e.target.value)}
          className="rounded-lg border border-border bg-surface px-2.5 py-2 text-[12.5px]"
        >
          <option value="">Tutte le squadre</option>
          {serieATeams.map((team) => (
            <option key={team} value={team}>
              {team}
            </option>
          ))}
        </select>

        <div className="flex items-center gap-4">
          {(["freeAgentOnly", "starterOnly", "watchlistOnly"] as const).map((key) => (
            <label key={key} className="flex cursor-pointer items-center gap-2 text-[12.5px]">
              <input
                type="checkbox"
                checked={searchParams.get(key) === "true"}
                onChange={() => toggleBoolean(key)}
                className="h-[15px] w-[15px] accent-indigo"
              />
              {BOOLEAN_LABELS[key]}
            </label>
          ))}
        </div>

        <button onClick={resetAll} className="text-[11.5px] font-bold text-ink-dim hover:text-coral">
          Azzera tutto
        </button>

        <div className="ml-auto text-[11px] text-ink-faint">{resultCount} risultati</div>
      </div>

      {activeCount > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {activeRoles.map((r) => (
            <span key={r} className="inline-flex items-center gap-1 rounded-full bg-indigo-soft px-2 py-1 text-[11px] font-bold text-indigo">
              {r}
              <X size={11} className="cursor-pointer" onClick={() => toggleRole(r)} />
            </span>
          ))}
          {activeSerieATeam && (
            <span className="inline-flex items-center gap-1 rounded-full bg-indigo-soft px-2 py-1 text-[11px] font-bold text-indigo">
              {activeSerieATeam}
              <X size={11} className="cursor-pointer" onClick={() => setParam("serieATeam", "")} />
            </span>
          )}
          {activeBooleans.map((k) => (
            <span key={k} className="inline-flex items-center gap-1 rounded-full bg-indigo-soft px-2 py-1 text-[11px] font-bold text-indigo">
              {BOOLEAN_LABELS[k]}
              <X size={11} className="cursor-pointer" onClick={() => toggleBoolean(k)} />
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
