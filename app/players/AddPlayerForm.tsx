"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const ROLES = ["GK", "DEF", "MID", "FWD"];

export default function AddPlayerForm() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [role, setRole] = useState("GK");
  const [serieATeam, setSerieATeam] = useState("");
  const [starter, setStarter] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const res = await fetch("/api/players", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, role, serieATeam, starter }),
    });

    if (!res.ok) {
      const body = await res.json();
      setError(body.error ?? "Errore");
      return;
    }

    setName("");
    setSerieATeam("");
    setStarter(false);
    setOpen(false);
    router.refresh();
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="px-3 py-1.5 bg-blue-600 text-white rounded text-sm"
      >
        Aggiungi giocatore
      </button>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="fixed inset-0 bg-black/30 flex items-center justify-center z-10"
    >
      <div className="bg-white rounded-lg p-6 space-y-3 w-80">
        <h2 className="font-semibold">Nuovo giocatore</h2>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Nome e cognome"
          required
          className="border rounded px-2 py-1 w-full text-sm"
        />
        <select
          value={role}
          onChange={(e) => setRole(e.target.value)}
          className="border rounded px-2 py-1 w-full text-sm"
        >
          {ROLES.map((r) => (
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
          className="border rounded px-2 py-1 w-full text-sm"
        />
        <label className="text-sm flex items-center gap-1">
          <input type="checkbox" checked={starter} onChange={(e) => setStarter(e.target.checked)} />
          Titolare
        </label>
        {error && <p className="text-red-600 text-sm">{error}</p>}
        <div className="flex gap-2 justify-end">
          <button type="button" onClick={() => setOpen(false)} className="text-sm text-gray-500">
            Annulla
          </button>
          <button type="submit" className="px-3 py-1 bg-green-600 text-white rounded text-sm">
            Salva
          </button>
        </div>
      </div>
    </form>
  );
}
