"use client";

import { useState } from "react";
import { UserPlus } from "lucide-react";
import AddPlayerDialog from "@/app/components/AddPlayerDialog";

export default function PlayersCard() {
  const [open, setOpen] = useState(false);

  return (
    <div className="flex flex-col gap-3.5 rounded-2xl border border-border bg-surface p-5 shadow-sm">
      <div className="flex items-center gap-2.5">
        <div className="flex h-9 w-9 items-center justify-center rounded-[10px] bg-[color-mix(in_srgb,var(--coral)_12%,white)] text-coral">
          <UserPlus size={18} strokeWidth={1.8} />
        </div>
        <div>
          <h3 className="text-[14.5px] font-extrabold">Giocatori</h3>
          <p className="text-xs text-ink-dim">Aggiungi un giocatore fuori listone</p>
        </div>
      </div>
      <p className="text-xs text-ink-dim">
        Serve durante l&apos;asta se viene chiamato un giocatore assente dal file importato.
      </p>
      <button
        onClick={() => setOpen(true)}
        className="self-start rounded-lg bg-indigo px-3.5 py-2 text-[12.5px] font-bold text-white"
      >
        Aggiungi giocatore
      </button>
      <AddPlayerDialog open={open} onOpenChange={setOpen} />
    </div>
  );
}
