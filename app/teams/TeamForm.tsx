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
        className="px-3 py-1.5 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm"
      >
        {mode === "create" ? "Nuova squadra" : "Modifica"}
      </button>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex gap-2 items-center flex-wrap">
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Nome squadra"
        required
        className="border rounded px-2 py-1 text-sm"
      />
      <input
        value={coach}
        onChange={(e) => setCoach(e.target.value)}
        placeholder="Allenatore"
        required
        className="border rounded px-2 py-1 text-sm"
      />
      <input
        type="number"
        value={totalCredits}
        onChange={(e) => setTotalCredits(Number(e.target.value))}
        min={0}
        required
        className="border rounded px-2 py-1 text-sm w-24"
      />
      <button type="submit" className="px-3 py-1 bg-green-600 text-white rounded text-sm">
        Salva
      </button>
      <button type="button" onClick={() => setOpen(false)} className="text-sm text-gray-500">
        Annulla
      </button>
      {error && <span className="text-red-600 text-sm">{error}</span>}
    </form>
  );
}
