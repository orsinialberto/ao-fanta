"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, ChevronUp, Star } from "lucide-react";
import type { PlayerWithTeam, TeamSummary } from "@/lib/types";
import { errorMessage } from "@/lib/http";
import type { Role } from "@/lib/roles";
import AssignDialog from "@/app/components/AssignDialog";

type SortKey = "name" | "role" | "serieATeam" | "starter" | "fantasyTeam" | "cost" | "watchlist";
type SortState = { key: SortKey; dir: "asc" | "desc" };

const COLUMNS: { key: SortKey; label: string }[] = [
  { key: "name", label: "Nome" },
  { key: "role", label: "Ruolo" },
  { key: "serieATeam", label: "Squadra Serie A" },
  { key: "starter", label: "Titolare" },
  { key: "fantasyTeam", label: "Stato" },
  { key: "cost", label: "Costo" },
  { key: "watchlist", label: "Wish" },
];

export default function PlayersTable({
  players,
  teams,
  roleLimits,
}: {
  players: PlayerWithTeam[];
  teams: TeamSummary[];
  roleLimits: Record<Role, number>;
}) {
  const router = useRouter();
  const [assigning, setAssigning] = useState<PlayerWithTeam | null>(null);
  const [assignOpen, setAssignOpen] = useState(false);
  const [sort, setSort] = useState<SortState | null>(null);

  const sortedPlayers = useMemo(() => {
    if (!sort) return players;

    const sorted = [...players];
    sorted.sort((a, b) => {
      let aVal: string | number | boolean = "";
      let bVal: string | number | boolean = "";

      switch (sort.key) {
        case "name":
          aVal = a.name.toLowerCase();
          bVal = b.name.toLowerCase();
          break;
        case "role":
          aVal = a.role;
          bVal = b.role;
          break;
        case "serieATeam":
          aVal = a.serieATeam.toLowerCase();
          bVal = b.serieATeam.toLowerCase();
          break;
        case "starter":
          aVal = a.starter ? 1 : 0;
          bVal = b.starter ? 1 : 0;
          break;
        case "fantasyTeam":
          aVal = (a.fantasyTeam?.name ?? "").toLowerCase();
          bVal = (b.fantasyTeam?.name ?? "").toLowerCase();
          break;
        case "cost":
          aVal = a.cost ?? 0;
          bVal = b.cost ?? 0;
          break;
        case "watchlist":
          aVal = a.watchlist ? 1 : 0;
          bVal = b.watchlist ? 1 : 0;
          break;
      }

      if (aVal < bVal) return sort.dir === "asc" ? -1 : 1;
      if (aVal > bVal) return sort.dir === "asc" ? 1 : -1;
      return 0;
    });

    return sorted;
  }, [players, sort]);

  function toggleSort(key: SortKey) {
    setSort((current) => {
      if (current?.key === key) {
        return { key, dir: current.dir === "asc" ? "desc" : "asc" };
      }
      return { key, dir: "asc" };
    });
  }

  function SortIcon({ column }: { column: SortKey }) {
    if (sort?.key !== column) return null;
    const Icon = sort.dir === "asc" ? ChevronUp : ChevronDown;
    return <Icon size={10} className="ml-[3px] inline-block align-[-1px] text-indigo" />;
  }

  async function toggleWatchlist(player: PlayerWithTeam) {
    const res = await fetch(`/api/players/${player.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ watchlist: !player.watchlist }),
    });
    if (!res.ok) {
      alert(await errorMessage(res));
      return;
    }
    router.refresh();
  }

  async function unassign(player: PlayerWithTeam) {
    const res = await fetch(`/api/players/${player.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fantasyTeamId: null }),
    });
    if (!res.ok) {
      alert(await errorMessage(res));
      return;
    }
    router.refresh();
  }

  return (
    <>
      <div className="overflow-hidden rounded-[14px] border border-border bg-surface shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] border-collapse text-[13px]">
            <thead>
              <tr>
                {COLUMNS.map((col) => (
                  <th
                    key={col.key}
                    onClick={() => toggleSort(col.key)}
                    className="cursor-pointer select-none whitespace-nowrap border-b border-border px-3.5 py-2.5 text-left text-[11px] font-bold uppercase tracking-[0.03em] text-ink-faint hover:text-ink-dim"
                  >
                    {col.label}
                    <SortIcon column={col.key} />
                  </th>
                ))}
                <th className="border-b border-border px-3.5 py-2.5" />
              </tr>
            </thead>
            <tbody className="[&>tr:last-child>td]:border-b-0">
              {sortedPlayers.map((p) => (
                <tr key={p.id} className="hover:bg-surface-2">
                  <td className="border-b border-border px-3.5 py-2.5 align-middle font-bold">
                    {p.name}
                  </td>
                  <td className="border-b border-border px-3.5 py-2.5 align-middle font-bold">
                    {p.role}
                  </td>
                  <td className="border-b border-border px-3.5 py-2.5 align-middle text-ink-dim">
                    {p.serieATeam}
                  </td>
                  <td className="border-b border-border px-3.5 py-2.5 align-middle">
                    <span
                      title="Titolare"
                      className={`inline-flex items-center ${p.starter ? "text-amber" : "text-ink-faint"}`}
                    >
                      <Star size={16} fill={p.starter ? "currentColor" : "none"} />
                    </span>
                  </td>
                  <td className="border-b border-border px-3.5 py-2.5 align-middle">
                    <span
                      className={`inline-flex items-center rounded-full px-2.5 py-[3px] text-[11px] font-bold ${
                        p.fantasyTeam ? "bg-indigo-soft text-indigo" : "bg-surface-2 text-ink-dim"
                      }`}
                    >
                      {p.fantasyTeam ? p.fantasyTeam.name : "Svincolato"}
                    </span>
                  </td>
                  <td className="border-b border-border px-3.5 py-2.5 align-middle font-mono font-bold tabular-nums">
                    {p.cost ?? "—"}
                  </td>
                  <td className="border-b border-border px-3.5 py-2.5 align-middle">
                    <button
                      type="button"
                      onClick={() => toggleWatchlist(p)}
                      title="Wishlist"
                      className={`inline-flex items-center rounded-md p-[3px] hover:bg-surface-2 hover:text-ink ${
                        p.watchlist ? "text-amber" : "text-ink-faint"
                      }`}
                    >
                      <Star size={16} fill={p.watchlist ? "currentColor" : "none"} />
                    </button>
                  </td>
                  <td className="border-b border-border px-3.5 py-2.5 align-middle">
                    {p.fantasyTeam ? (
                      <button
                        type="button"
                        onClick={() => unassign(p)}
                        className="text-[12px] font-bold text-coral"
                      >
                        Svincola
                      </button>
                    ) : teams.length > 0 ? (
                      <button
                        type="button"
                        onClick={() => {
                          setAssigning(p);
                          setAssignOpen(true);
                        }}
                        className="text-[12px] font-bold text-indigo"
                      >
                        Assegna
                      </button>
                    ) : (
                      <span className="text-[12px] text-ink-faint">Crea prima una squadra</span>
                    )}
                  </td>
                </tr>
              ))}
              {sortedPlayers.length === 0 && (
                <tr>
                  <td colSpan={COLUMNS.length + 1} className="px-3.5 py-10 text-center text-ink-dim">
                    Nessun giocatore da mostrare.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <AssignDialog
        player={assigning}
        teams={teams}
        roleLimits={roleLimits}
        open={assignOpen}
        onOpenChange={setAssignOpen}
        onAssigned={() => {
          setAssignOpen(false);
          router.refresh();
        }}
      />
    </>
  );
}
