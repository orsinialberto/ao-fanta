"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/app/components/ui/dialog";
import { errorMessage } from "@/lib/http";
import { ROLE_LABELS, isValidRole, type Role } from "@/lib/roles";
import type { PlayerWithTeam, TeamSummary } from "@/lib/types";

const ROLE_BADGE_BG: Record<Role, string> = {
  P: "bg-teal",
  D: "bg-indigo",
  C: "bg-amber",
  A: "bg-coral",
};

export default function AssignDialog({
  player,
  teams,
  roleLimits,
  open,
  onOpenChange,
  onAssigned,
}: {
  player: PlayerWithTeam | null;
  teams: TeamSummary[];
  roleLimits: Record<Role, number>;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAssigned: () => void;
}) {
  const [teamId, setTeamId] = useState(teams[0]?.id ?? "");
  const [cost, setCost] = useState(0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setTeamId(teams[0]?.id ?? "");
      setCost(0);
      setError(null);
    }
  }, [open, teams]);

  if (!player) return null;

  const selectedTeam = teams.find((t) => t.id === teamId);
  const overBudget = selectedTeam ? cost > selectedTeam.remainingCredits : false;
  const role = isValidRole(player.role) ? player.role : null;
  const roleFull = selectedTeam && role ? selectedTeam.roleCounts[role] >= roleLimits[role] : false;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const res = await fetch(`/api/players/${player!.id}`, {
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
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <span
              className={`flex h-9 w-9 items-center justify-center rounded-[10px] text-[13px] font-extrabold text-white ${
                role ? ROLE_BADGE_BG[role] : "bg-ink-dim"
              }`}
            >
              {player.role}
            </span>
            <div>
              <DialogTitle>Assegna {player.name}</DialogTitle>
              <p className="text-[11.5px] text-ink-dim">{player.serieATeam}</p>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-3.5">
          <div>
            <label className="mb-1.5 block text-[11px] font-bold text-ink-dim">Squadra</label>
            <select
              value={teamId}
              onChange={(e) => setTeamId(e.target.value)}
              required
              className="w-full rounded-lg border border-border bg-surface-2 px-3 py-2.5 text-[13.5px]"
            >
              {teams.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name} (residui: {t.remainingCredits})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1.5 block text-[11px] font-bold text-ink-dim">Costo (crediti)</label>
            <input
              type="number"
              value={cost}
              onChange={(e) => setCost(Number(e.target.value))}
              min={0}
              required
              className="w-full rounded-lg border border-border bg-surface-2 px-3 py-2.5 text-[13.5px]"
            />
          </div>

          {overBudget && (
            <p className="rounded-lg bg-amber-soft px-2.5 py-2 text-xs font-medium text-amber">
              Attenzione: costo superiore ai crediti residui della squadra.
            </p>
          )}
          {roleFull && role && (
            <p className="rounded-lg bg-coral-soft px-2.5 py-2 text-xs font-medium text-coral">
              Limite raggiunto per ruolo {ROLE_LABELS[role]} ({selectedTeam!.roleCounts[role]}/
              {roleLimits[role]}).
            </p>
          )}
          {error && <p className="text-xs text-coral">{error}</p>}

          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => onOpenChange(false)} className="text-sm text-ink-dim">
              Annulla
            </button>
            <button
              type="submit"
              disabled={roleFull}
              className="rounded-lg bg-teal px-3.5 py-2 text-[12.5px] font-bold text-white disabled:opacity-40"
            >
              Conferma
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
