"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { PlayerWithTeam, TeamSummary } from "@/lib/types";

export default function PlayersTable({
  players,
  teams,
}: {
  players: PlayerWithTeam[];
  teams: TeamSummary[];
}) {
  const router = useRouter();
  const [assigning, setAssigning] = useState<PlayerWithTeam | null>(null);

  async function toggleWatchlist(player: PlayerWithTeam) {
    await fetch(`/api/players/${player.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ watchlist: !player.watchlist }),
    });
    router.refresh();
  }

  async function unassign(player: PlayerWithTeam) {
    await fetch(`/api/players/${player.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fantasyTeamId: null }),
    });
    router.refresh();
  }

  return (
    <>
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr className="text-left border-b">
            <th className="py-2">Nome</th>
            <th>Ruolo</th>
            <th>Squadra Serie A</th>
            <th>Titolare</th>
            <th>Stato</th>
            <th>Costo</th>
            <th>Watchlist</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {players.map((p) => (
            <tr key={p.id} className="border-b">
              <td className="py-1.5">{p.name}</td>
              <td>{p.role}</td>
              <td>{p.serieATeam}</td>
              <td>{p.starter ? "Sì" : "-"}</td>
              <td>{p.fantasyTeam ? p.fantasyTeam.name : "Svincolato"}</td>
              <td>{p.cost ?? "-"}</td>
              <td>
                <button onClick={() => toggleWatchlist(p)} title="Watchlist">
                  {p.watchlist ? "★" : "☆"}
                </button>
              </td>
              <td>
                {p.fantasyTeam ? (
                  <button onClick={() => unassign(p)} className="text-red-600 text-xs">
                    Svincola
                  </button>
                ) : (
                  <button onClick={() => setAssigning(p)} className="text-blue-600 text-xs">
                    Assegna
                  </button>
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

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const res = await fetch(`/api/players/${player.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fantasyTeamId: teamId, cost }),
    });

    if (!res.ok) {
      const body = await res.json();
      setError(body.error ?? "Errore");
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
        {error && <p className="text-red-600 text-sm">{error}</p>}
        <div className="flex gap-2 justify-end">
          <button type="button" onClick={onClose} className="text-sm text-gray-500">
            Annulla
          </button>
          <button type="submit" className="px-3 py-1 bg-green-600 text-white rounded text-sm">
            Conferma
          </button>
        </div>
      </div>
    </form>
  );
}
