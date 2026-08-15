"use client";

import { useEffect, useRef, useState } from "react";
import { Star } from "lucide-react";
import RoleBadge from "@/app/components/RoleBadge";
import { errorMessage } from "@/lib/http";
import { ROLE_ORDER, type Role } from "@/lib/roles";
import type { PlayerWithTeam } from "@/lib/types";
import SettingsSection from "./SettingsSection";

const DEBOUNCE_MS = 200;

export default function EditPlayerCard() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<PlayerWithTeam[]>([]);
  const [selected, setSelected] = useState<PlayerWithTeam | null>(null);
  const [error, setError] = useState("");
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      return;
    }
    clearTimeout(timer.current);
    timer.current = setTimeout(async () => {
      const res = await fetch(`/api/players?search=${encodeURIComponent(query)}`);
      if (res.ok) setResults(await res.json());
    }, DEBOUNCE_MS);
    return () => clearTimeout(timer.current);
  }, [query]);

  function selectPlayer(p: PlayerWithTeam) {
    setSelected(p);
    setQuery("");
    setResults([]);
    setError("");
  }

  async function changeRole(newRole: Role) {
    if (!selected) return;
    const res = await fetch(`/api/players/${selected.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role: newRole }),
    });
    if (!res.ok) {
      setError(await errorMessage(res));
      return;
    }
    setError("");
    setSelected(await res.json());
  }

  async function toggleStarter() {
    if (!selected) return;
    const res = await fetch(`/api/players/${selected.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ starter: !selected.starter }),
    });
    if (!res.ok) {
      setError(await errorMessage(res));
      return;
    }
    setError("");
    setSelected(await res.json());
  }

  const dropdownOpen = query.trim().length > 0;

  return (
    <SettingsSection
      title="Modifica giocatore"
      description="Correggi ruolo e stato di titolare di un giocatore già a listone."
    >
      <div className="relative">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Cerca per nome giocatore…"
          className="w-full rounded-lg border border-line bg-surface px-3 py-2 text-small focus:border-accent focus:outline-none"
        />
        {dropdownOpen && (
          <div className="absolute z-10 mt-1.5 w-full rounded-lg border border-line bg-surface p-1 shadow-overlay">
            {results.map((p) => (
              <button
                key={p.id}
                onClick={() => selectPlayer(p)}
                className="flex w-full items-center gap-2.5 rounded-lg px-2 py-2 text-left hover:bg-surface-sunk"
              >
                <RoleBadge role={p.role} size="sm" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-small font-semibold">{p.name}</span>
                  <span className="block text-small-dense text-ink-2">{p.serieATeam}</span>
                </span>
              </button>
            ))}
            {results.length === 0 && (
              <p className="px-2 py-2 text-xs text-ink-2">Nessun giocatore trovato.</p>
            )}
          </div>
        )}
      </div>

      {selected && (
        <div className="rounded-lg border border-line p-3">
          <div className="mb-3 flex items-center gap-2.5">
            <RoleBadge role={selected.role} />
            <span className="min-w-0 flex-1">
              <span className="block truncate text-small font-semibold">{selected.name}</span>
              <span className="block text-small-dense text-ink-2">{selected.serieATeam}</span>
            </span>
            <button
              onClick={() => setSelected(null)}
              className="flex-shrink-0 text-small-dense font-semibold text-ink-2 hover:text-danger"
            >
              Cambia
            </button>
          </div>

          <div className="flex items-center gap-4">
            <label className="flex items-center gap-1.5 text-label uppercase text-ink-3">
              Ruolo
              <select
                value={selected.role}
                onChange={(e) => changeRole(e.target.value as Role)}
                className="rounded-sm border border-line bg-surface px-1.5 py-1 text-small-dense font-semibold normal-case tracking-normal text-ink"
              >
                {ROLE_ORDER.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </label>

            <button
              type="button"
              onClick={toggleStarter}
              title="Titolare (clicca per cambiare)"
              className={`inline-flex items-center gap-1.5 text-label uppercase ${
                selected.starter ? "text-role-c" : "text-ink-3"
              }`}
            >
              <Star size={15} fill={selected.starter ? "currentColor" : "none"} />
              Titolare
            </button>
          </div>
        </div>
      )}

      {error && <p className="text-xs text-danger">{error}</p>}
    </SettingsSection>
  );
}
