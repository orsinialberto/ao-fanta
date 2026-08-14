"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import type { PlayerWithTeam, TeamSummary } from "@/lib/types";
import { errorMessage } from "@/lib/http";
import { ROLE_LABELS, isValidRole, ROLE_ORDER, type Role } from "@/lib/roles";
import AssignDialog from "@/app/components/AssignDialog";

type SortKey = "name" | "role" | "serieATeam" | "starter" | "fantasyTeam" | "cost" | "watchlist";
type SortState = { key: SortKey; dir: "asc" | "desc" };

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

  function getSortIndicator(key: SortKey) {
    if (sort?.key !== key) return "";
    return sort.dir === "asc" ? " ▲" : " ▼";
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

  async function toggleStarter(player: PlayerWithTeam) {
    const res = await fetch(`/api/players/${player.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ starter: !player.starter }),
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

  async function changeRole(player: PlayerWithTeam, newRole: string) {
    const res = await fetch(`/api/players/${player.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role: newRole }),
    });
    if (!res.ok) {
      alert(await errorMessage(res));
      return;
    }
    router.refresh();
  }

  return (
    <>
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr className="text-left border-b">
            <th
              className="py-2 cursor-pointer hover:bg-gray-100"
              onClick={() => toggleSort("name")}
            >
              Nome{getSortIndicator("name")}
            </th>
            <th
              className="cursor-pointer hover:bg-gray-100"
              onClick={() => toggleSort("role")}
            >
              Ruolo{getSortIndicator("role")}
            </th>
            <th
              className="cursor-pointer hover:bg-gray-100"
              onClick={() => toggleSort("serieATeam")}
            >
              Squadra Serie A{getSortIndicator("serieATeam")}
            </th>
            <th
              className="cursor-pointer hover:bg-gray-100"
              onClick={() => toggleSort("starter")}
            >
              Titolare{getSortIndicator("starter")}
            </th>
            <th
              className="cursor-pointer hover:bg-gray-100"
              onClick={() => toggleSort("fantasyTeam")}
            >
              Stato{getSortIndicator("fantasyTeam")}
            </th>
            <th
              className="cursor-pointer hover:bg-gray-100"
              onClick={() => toggleSort("cost")}
            >
              Costo{getSortIndicator("cost")}
            </th>
            <th
              className="cursor-pointer hover:bg-gray-100"
              onClick={() => toggleSort("watchlist")}
            >
              Watchlist{getSortIndicator("watchlist")}
            </th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {sortedPlayers.map((p) => (
            <tr key={p.id} className="border-b">
              <td className="py-1.5">{p.name}</td>
              <td>
                <select
                  value={p.role}
                  onChange={(e) => changeRole(p, e.target.value)}
                  className="border rounded px-1 py-0.5 text-sm"
                >
                  {ROLE_ORDER.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
              </td>
              <td>{p.serieATeam}</td>
              <td>
                <button
                  type="button"
                  onClick={() => toggleStarter(p)}
                  title="Titolare (clicca per cambiare)"
                  className="text-xs"
                >
                  {p.starter ? "Sì" : "-"}
                </button>
              </td>
              <td>{p.fantasyTeam ? p.fantasyTeam.name : "Svincolato"}</td>
              <td>{p.cost ?? "-"}</td>
              <td>
                <button type="button" onClick={() => toggleWatchlist(p)} title="Watchlist">
                  {p.watchlist ? "★" : "☆"}
                </button>
              </td>
              <td>
                {p.fantasyTeam ? (
                  <button type="button" onClick={() => unassign(p)} className="text-red-600 text-xs">
                    Svincola
                  </button>
                ) : teams.length > 0 ? (
                  <button type="button" onClick={() => { setAssigning(p); setAssignOpen(true); }} className="text-blue-600 text-xs">
                    Assegna
                  </button>
                ) : (
                  <span className="text-gray-400 text-xs">Crea prima una squadra</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

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
