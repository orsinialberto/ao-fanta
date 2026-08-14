"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/app/components/ui/dialog";
import { errorMessage } from "@/lib/http";
import { ROLE_ORDER } from "@/lib/roles";

export default function AddPlayerDialog({
  open,
  onOpenChange,
  initialName = "",
  onCreated,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialName?: string;
  onCreated?: (player: { id: string; name: string }) => void;
}) {
  const router = useRouter();
  const [name, setName] = useState(initialName);
  const [role, setRole] = useState<string>(ROLE_ORDER[0]);
  const [serieATeam, setSerieATeam] = useState("");
  const [starter, setStarter] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) setName(initialName);
  }, [open, initialName]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const res = await fetch("/api/players", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, role, serieATeam, starter }),
    });

    if (!res.ok) {
      setError(await errorMessage(res));
      return;
    }

    const player = await res.json();
    setName("");
    setSerieATeam("");
    setStarter(false);
    onOpenChange(false);
    onCreated?.(player);
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nuovo giocatore</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Nome e cognome"
            required
            className="rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm"
          />
          <select
            value={role}
            onChange={(e) => setRole(e.target.value)}
            className="rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm"
          >
            {ROLE_ORDER.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
          <input
            value={serieATeam}
            onChange={(e) => setSerieATeam(e.target.value)}
            placeholder="Squadra Serie A"
            required
            className="rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm"
          />
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={starter} onChange={(e) => setStarter(e.target.checked)} />
            Titolare
          </label>
          {error && <p className="text-sm text-coral">{error}</p>}
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => onOpenChange(false)} className="text-sm text-ink-dim">
              Annulla
            </button>
            <button type="submit" className="rounded-lg bg-indigo px-3.5 py-2 text-[12.5px] font-bold text-white">
              Salva
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
