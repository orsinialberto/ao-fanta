"use client";

import { useState } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { SlidersHorizontal, ChevronRight, X } from "lucide-react";
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
  const [collapsed, setCollapsed] = useState(false);

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

  if (collapsed) {
    return (
      <aside className="flex w-[52px] flex-shrink-0 flex-col items-center gap-3 rounded-2xl border border-border bg-surface p-2.5 pt-4 shadow-sm">
        {activeCount > 0 && (
          <span className="flex h-5 w-5 items-center justify-center rounded-md bg-indigo text-[10px] font-extrabold text-white">
            {activeCount}
          </span>
        )}
        <button onClick={() => setCollapsed(false)} className="rounded-md p-1 text-ink-dim hover:bg-surface-2">
          <ChevronRight size={15} className="rotate-180" />
        </button>
      </aside>
    );
  }

  return (
    <aside className="w-[272px] flex-shrink-0 rounded-2xl border border-border bg-surface p-4 shadow-sm">
      <div className="mb-3.5 flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-[13px] font-extrabold">
          <SlidersHorizontal size={15} className="text-ink-dim" />
          Filtri
        </div>
        <button onClick={() => setCollapsed(true)} className="rounded-md p-0.5 text-ink-dim hover:bg-surface-2">
          <ChevronRight size={15} />
        </button>
      </div>

      <div className="mb-[18px]">
        <div className="mb-2 text-[11px] font-bold uppercase tracking-wide text-ink-faint">Ruolo</div>
        <div className="flex gap-1.5">
          {ROLE_ORDER.map((role) => (
            <button
              key={role}
              onClick={() => toggleRole(role)}
              className={`flex-1 rounded-lg border-[1.5px] py-1.5 text-[12px] font-extrabold ${
                activeRoles.includes(role) ? ROLE_CHIP_ON[role] : "border-border text-ink-dim"
              }`}
            >
              {role}
            </button>
          ))}
        </div>
      </div>

      <div className="mb-[18px]">
        <div className="mb-2 text-[11px] font-bold uppercase tracking-wide text-ink-faint">Squadra Serie A</div>
        <select
          value={activeSerieATeam}
          onChange={(e) => setParam("serieATeam", e.target.value)}
          className="w-full rounded-lg border border-border bg-surface px-2.5 py-2 text-[12.5px]"
        >
          <option value="">Tutte le squadre</option>
          {serieATeams.map((team) => (
            <option key={team} value={team}>
              {team}
            </option>
          ))}
        </select>
      </div>

      <div className="mb-[18px]">
        <div className="mb-2 text-[11px] font-bold uppercase tracking-wide text-ink-faint">Stato</div>
        {(["freeAgentOnly", "starterOnly", "watchlistOnly"] as const).map((key) => (
          <label key={key} className="flex cursor-pointer items-center gap-2 py-1 text-[12.5px]">
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

      {activeCount > 0 && (
        <div className="mb-2.5 flex flex-wrap gap-1.5">
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

      <button onClick={resetAll} className="text-[11.5px] font-bold text-ink-dim hover:text-coral">
        Azzera tutto
      </button>
      <div className="mt-2 text-[11px] text-ink-faint">{resultCount} risultati</div>
    </aside>
  );
}
