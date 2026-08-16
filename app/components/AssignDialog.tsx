"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/app/components/ui/dialog";
import RoleBadge from "@/app/components/RoleBadge";
import InlineError from "@/app/components/InlineError";
import { errorMessage } from "@/lib/http";
import { ROLE_LABELS, isValidRole, type Role } from "@/lib/roles";
import { TIER_LABELS, isValidTier } from "@/lib/wishlist";
import type { PlayerWithTeam, TeamSummary } from "@/lib/types";

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
  const tier = isValidTier(player.wishlistTier ?? "") ? player.wishlistTier : null;
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
            <RoleBadge role={player.role} size="lg" />
            <div>
              <DialogTitle>{player.name}</DialogTitle>
              <p className="mt-1.5 flex items-center gap-1.5 text-small text-ink-3">
                {player.serieATeam}
                {tier && <span>—</span>}
                {tier && (
                  <span
                    title={`Lista ${tier} — ${TIER_LABELS[tier]}`}
                    className="flex h-5 w-5 items-center justify-center rounded-sm border border-accent bg-accent-bg font-mono text-small-dense font-semibold text-accent"
                  >
                    {tier}
                  </span>
                )}
              </p>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <div>
            <label className="mb-1 block text-label uppercase text-ink-3">Squadra</label>
            <select
              value={teamId}
              onChange={(e) => setTeamId(e.target.value)}
              required
              className="w-full rounded-md border border-line-strong bg-surface px-3 py-2 text-body transition-colors duration-fast ease-standard focus:border-accent focus:outline-none"
            >
              {teams.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name} (residui: {t.remainingCredits})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-label uppercase text-ink-3">Costo (crediti)</label>
            <input
              type="number"
              value={cost}
              onChange={(e) => setCost(Number(e.target.value))}
              min={0}
              required
              className="w-full rounded-md border border-line-strong bg-surface px-3 py-2 text-body transition-colors duration-fast ease-standard focus:border-accent focus:outline-none"
            />
          </div>

          {overBudget && (
            <InlineError
              title="Costo superiore ai crediti residui"
              message={`${selectedTeam!.name} ha ${selectedTeam!.remainingCredits} crediti. Puoi confermare comunque, ma la squadra andrà in negativo.`}
            />
          )}
          {roleFull && role && (
            <InlineError
              title={`Limite raggiunto per ${ROLE_LABELS[role]}`}
              message={`${selectedTeam!.name} ha già ${selectedTeam!.roleCounts[role]} giocatori su ${roleLimits[role]}. Svincolane uno per assegnare ${player.name}.`}
            />
          )}
          {error && <InlineError message={error} />}

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="text-small text-ink-2 transition-colors duration-fast ease-standard hover:text-ink"
            >
              Annulla
            </button>
            <button
              type="submit"
              disabled={roleFull}
              className="rounded-md bg-accent px-3 py-2 text-small font-semibold text-white transition-colors duration-fast ease-standard hover:bg-accent-hover disabled:opacity-40"
            >
              Conferma
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
