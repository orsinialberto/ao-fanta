"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Star } from "lucide-react";
import AssignDialog from "@/app/components/AssignDialog";
import RoleBadge from "@/app/components/RoleBadge";
import type { PlayerWithTeam, TeamSummary } from "@/lib/types";
import type { Role } from "@/lib/roles";

export default function WishlistPanel({
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

  return (
    <div className="rounded-2xl border border-border bg-surface p-[18px] shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="flex items-center gap-[7px] text-[13.5px] font-extrabold">
          <Star size={15} className="text-ink-dim" />
          Wishlist
        </h3>
        <span className="text-[11px] font-semibold text-ink-faint">
          {players.length} svincolati
        </span>
      </div>

      {players.length === 0 && (
        <p className="text-xs text-ink-dim">Nessun giocatore in wishlist.</p>
      )}

      {players.map((p) => (
        <div key={p.id} className="flex items-center gap-2.5 rounded-lg px-1 py-2 hover:bg-surface-2">
          <RoleBadge role={p.role} />
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[13px] font-bold">{p.name}</span>
            <span className="block text-[11px] text-ink-dim">{p.serieATeam}</span>
          </span>
          <Star size={16} className="flex-shrink-0 text-amber" fill="currentColor" />
          {teams.length > 0 && (
            <button
              type="button"
              onClick={() => {
                setAssigning(p);
                setAssignOpen(true);
              }}
              className="flex-shrink-0 rounded-[7px] bg-indigo-soft px-2.5 py-1.5 text-[11.5px] font-bold text-indigo"
            >
              Assegna
            </button>
          )}
        </div>
      ))}

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
    </div>
  );
}
