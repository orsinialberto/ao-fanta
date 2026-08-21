"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { errorMessage } from "@/lib/http";

type Team = { id: string; name: string; coach: string; totalCredits: number };

export default function TeamForm({
  mode,
  team,
}: {
  mode: "create" | "edit";
  team?: Team;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(team?.name ?? "");
  const [coach, setCoach] = useState(team?.coach ?? "");
  const [totalCredits, setTotalCredits] = useState(team?.totalCredits ?? 500);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const url = mode === "create" ? "/api/teams" : `/api/teams/${team!.id}`;
    const method = mode === "create" ? "POST" : "PATCH";

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, coach, totalCredits: Number(totalCredits) }),
    });

    if (!res.ok) {
      setError(await errorMessage(res));
      return;
    }

    setOpen(false);
    router.refresh();
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="rounded-lg bg-accent px-3 py-1.5 text-small-dense font-bold text-on-accent"
      >
        {mode === "create" ? "Nuova squadra" : "Modifica"}
      </button>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-wrap items-center gap-2">
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Nome squadra"
        required
        className="rounded-lg border border-line px-2 py-1 text-small-dense"
      />
      <input
        value={coach}
        onChange={(e) => setCoach(e.target.value)}
        placeholder="Allenatore"
        required
        className="rounded-lg border border-line px-2 py-1 text-small-dense"
      />
      <input
        type="number"
        value={totalCredits}
        onChange={(e) => setTotalCredits(Number(e.target.value))}
        min={0}
        required
        className="w-24 rounded-lg border border-line px-2 py-1 text-small-dense"
      />
      <button type="submit" className="rounded-lg bg-role-p px-3 py-1 text-small-dense font-bold text-on-role">
        Salva
      </button>
      <button type="button" onClick={() => setOpen(false)} className="text-small-dense font-semibold text-ink-2">
        Annulla
      </button>
      {error && <span className="text-small-dense font-semibold text-danger">{error}</span>}
    </form>
  );
}
