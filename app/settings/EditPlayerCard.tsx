"use client";

import { useEffect, useRef, useState } from "react";
import { Pencil, Star } from "lucide-react";
import RoleBadge from "@/app/components/RoleBadge";
import { errorMessage } from "@/lib/http";
import { ROLE_ORDER, type Role } from "@/lib/roles";
import type { PlayerWithTeam } from "@/lib/types";

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
    <div className="flex flex-col gap-3.5 rounded-2xl border border-border bg-surface p-5 shadow-sm">
      <div className="flex items-center gap-2.5">
        <div className="flex h-9 w-9 items-center justify-center rounded-[10px] bg-indigo-soft text-indigo">
          <Pencil size={18} strokeWidth={1.8} />
        </div>
        <div>
          <h3 className="text-[14.5px] font-extrabold">Modifica giocatore</h3>
          <p className="text-xs text-ink-dim">Correggi ruolo e titolarità</p>
        </div>
      </div>

      <div className="relative">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Cerca per nome giocatore…"
          className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-[13px] focus:border-indigo focus:outline-none"
        />
        {dropdownOpen && (
          <div className="absolute z-10 mt-1.5 w-full rounded-lg border border-border bg-surface p-1 shadow-sm">
            {results.map((p) => (
              <button
                key={p.id}
                onClick={() => selectPlayer(p)}
                className="flex w-full items-center gap-2.5 rounded-lg px-2 py-2 text-left hover:bg-surface-2"
              >
                <RoleBadge role={p.role} size="sm" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[13px] font-bold">{p.name}</span>
                  <span className="block text-[11px] text-ink-dim">{p.serieATeam}</span>
                </span>
              </button>
            ))}
            {results.length === 0 && (
              <p className="px-2 py-2 text-xs text-ink-dim">Nessun giocatore trovato.</p>
            )}
          </div>
        )}
      </div>

      {selected && (
        <div className="rounded-lg border border-border p-3">
          <div className="mb-3 flex items-center gap-2.5">
            <RoleBadge role={selected.role} />
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[13px] font-bold">{selected.name}</span>
              <span className="block text-[11px] text-ink-dim">{selected.serieATeam}</span>
            </span>
            <button
              onClick={() => setSelected(null)}
              className="flex-shrink-0 text-[11.5px] font-bold text-ink-dim hover:text-coral"
            >
              Cambia
            </button>
          </div>

          <div className="flex items-center gap-4">
            <label className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-ink-faint">
              Ruolo
              <select
                value={selected.role}
                onChange={(e) => changeRole(e.target.value as Role)}
                className="rounded-[7px] border border-border bg-surface px-1.5 py-[3px] text-[12px] font-bold normal-case tracking-normal text-ink"
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
              className={`inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide ${
                selected.starter ? "text-amber" : "text-ink-faint"
              }`}
            >
              <Star size={15} fill={selected.starter ? "currentColor" : "none"} />
              Titolare
            </button>
          </div>
        </div>
      )}

      {error && <p className="text-xs text-coral">{error}</p>}
    </div>
  );
}
