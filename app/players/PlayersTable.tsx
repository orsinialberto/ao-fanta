"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import type { PlayerWithTeam, TeamSummary } from "@/lib/types";
import { errorMessage } from "@/lib/http";
import { ROLE_LABELS, ROLE_LIMITS, isValidRole, ROLE_ORDER } from "@/lib/roles";

type SortKey = "name" | "role" | "serieATeam" | "starter" | "fantasyTeam" | "cost" | "watchlist";
type SortState = { key: SortKey; dir: "asc" | "desc" };

export default function PlayersTable({
  players,
  teams,
}: {
  players: PlayerWithTeam[];
  teams: TeamSummary[];
}) {
  const router = useRouter();
  const [assigning, setAssigning] = useState<PlayerWithTeam | null>(null);
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
                  <button type="button" onClick={() => setAssigning(p)} className="text-blue-600 text-xs">
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

      {assigning && (
        <AssignModal
          player={assigning}
          teams={teams}
          onClose={() => setAssigning(null)}
          onAssigned={() => {
            setAssigning(null);
            router.refresh();
          }}
        />
      )}
    </>
  );
}

function AssignModal({
  player,
  teams,
  onClose,
  onAssigned,
}: {
  player: PlayerWithTeam;
  teams: TeamSummary[];
  onClose: () => void;
  onAssigned: () => void;
}) {
  const [teamId, setTeamId] = useState(teams[0]?.id ?? "");
  const [cost, setCost] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const selectedTeam = teams.find((t) => t.id === teamId);
  const overBudget = selectedTeam ? cost > selectedTeam.remainingCredits : false;
  const role = isValidRole(player.role) ? player.role : null;
  const roleFull =
    selectedTeam && role ? selectedTeam.roleCounts[role] >= ROLE_LIMITS[role] : false;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const res = await fetch(`/api/players/${player.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fantasyTeamId: teamId, cost }),
    });

    if (!res.ok) {
      setError(await errorMessage(res));
      return;
    }

    onAssigned();
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="fixed inset-0 bg-black/30 flex items-center justify-center z-10"
    >
      <div className="bg-white rounded-lg p-6 space-y-3 w-80">
        <h2 className="font-semibold">Assegna {player.name}</h2>
        <select
          value={teamId}
          onChange={(e) => setTeamId(e.target.value)}
          required
          className="border rounded px-2 py-1 w-full text-sm"
        >
          {teams.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name} (residui: {t.remainingCredits})
            </option>
          ))}
        </select>
        <input
          type="number"
          value={cost}
          onChange={(e) => setCost(Number(e.target.value))}
          min={0}
          required
          className="border rounded px-2 py-1 w-full text-sm"
        />
        {overBudget && (
          <p className="text-orange-600 text-sm">
            Attenzione: costo superiore ai crediti residui della squadra.
          </p>
        )}
        {roleFull && role && (
          <p className="text-red-600 text-sm">
            Limite raggiunto per ruolo {ROLE_LABELS[role]} ({selectedTeam!.roleCounts[role]}/
            {ROLE_LIMITS[role]}).
          </p>
        )}
        {error && <p className="text-red-600 text-sm">{error}</p>}
        <div className="flex gap-2 justify-end">
          <button type="button" onClick={onClose} className="text-sm text-gray-500">
            Annulla
          </button>
          <button
            type="submit"
            disabled={roleFull}
            className="px-3 py-1 bg-green-600 text-white rounded text-sm disabled:opacity-40"
          >
            Conferma
          </button>
        </div>
      </div>
    </form>
  );
}
