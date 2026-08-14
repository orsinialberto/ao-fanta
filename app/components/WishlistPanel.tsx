"use client";

import RoleBadge from "@/app/components/RoleBadge";
import { ROLE_ORDER, ROLE_LABELS } from "@/lib/roles";
import type { PlayerWithTeam } from "@/lib/types";

export default function WishlistPanel({ players }: { players: PlayerWithTeam[] }) {
  return (
    <div className="rounded-2xl border border-border bg-surface p-[18px] shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-[13.5px] font-extrabold">Wishlist</h3>
        <span className="text-[11px] font-semibold text-ink-faint">
          {players.length} svincolati
        </span>
      </div>

      {players.length === 0 && (
        <p className="text-xs text-ink-dim">Nessun giocatore in wishlist.</p>
      )}

      {players.length > 0 && (
        <div className="grid grid-cols-2 gap-3.5">
          {ROLE_ORDER.map((role, i) => {
            const roleplayers = players.filter((p) => p.role === role);
            const rightCol = i % 2 === 1;
            return (
              <div key={role} className={rightCol ? "pl-7" : ""}>
                <div className="mb-1.5 text-[10.5px] font-bold uppercase tracking-[0.04em] text-ink-faint">
                  {ROLE_LABELS[role]}
                </div>
                {roleplayers.length === 0 && (
                  <p className="text-xs text-ink-dim">Nessuno.</p>
                )}
                {roleplayers.map((p) => (
                  <div key={p.id} className="flex items-center gap-2.5 rounded-lg px-1 py-2 hover:bg-surface-2">
                    <RoleBadge role={p.role} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[13px] font-bold">{p.name}</span>
                      <span className="block text-[11px] text-ink-dim">{p.serieATeam}</span>
                    </span>
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
