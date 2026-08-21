"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Search, X } from "lucide-react";
import AssignPanel from "@/app/components/AssignPanel";
import AddPlayerDialog from "@/app/components/AddPlayerDialog";
import RoleBadge from "@/app/components/RoleBadge";
import type { RoleStats } from "@/lib/roleStats";
import type { PlayerWithTeam, TeamSummary } from "@/lib/types";
import type { Role } from "@/lib/roles";

const DEBOUNCE_MS = 200;

export default function AstaSearch({
  teams,
  roleLimits,
  roleStats,
}: {
  teams: TeamSummary[];
  roleLimits: Record<Role, number>;
  roleStats: Record<Role, RoleStats>;
}) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<PlayerWithTeam[]>([]);
  const [selected, setSelected] = useState<PlayerWithTeam | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      return;
    }
    clearTimeout(timer.current);
    timer.current = setTimeout(async () => {
      const res = await fetch(`/api/players?search=${encodeURIComponent(query)}&freeAgentOnly=true`);
      if (res.ok) {
        setResults(await res.json());
        setActiveIndex(0);
      }
    }, DEBOUNCE_MS);
    return () => clearTimeout(timer.current);
  }, [query]);

  // Il pannello prende il posto della lista: chiuderlo riporta ai risultati con
  // la ricerca intatta, così un giocatore scelto per sbaglio costa un Esc.
  function closePanel() {
    setSelected(null);
    inputRef.current?.focus();
  }

  function clearSearch() {
    setSelected(null);
    setQuery("");
    inputRef.current?.focus();
  }

  const resultsOpen = query.trim().length > 0 && !selected;

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Escape") {
      e.preventDefault();
      if (selected) closePanel();
      else if (query) setQuery("");
      return;
    }
    if (!resultsOpen) return;

    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      if (results.length === 0) return;
      const step = e.key === "ArrowDown" ? 1 : -1;
      setActiveIndex((i) => (i + step + results.length) % results.length);
      return;
    }
    if (e.key === "Enter") {
      e.preventDefault();
      if (results.length === 0) setAddOpen(true);
      else if (results[activeIndex]) setSelected(results[activeIndex]);
    }
  }

  return (
    <div className="overflow-hidden rounded-lg border border-line-strong bg-surface">
      <div className="flex items-center gap-3 px-4 py-3">
        <Search className="pointer-events-none shrink-0 text-ink-3" size={17} />
        <input
          autoFocus
          ref={inputRef}
          value={query}
          onChange={(e) => {
            // Riscrivere la ricerca vuol dire cambiare giocatore: il pannello
            // lascia il posto ai risultati aggiornati.
            setSelected(null);
            setQuery(e.target.value);
          }}
          onKeyDown={handleKeyDown}
          placeholder="Cerca per nome giocatore…"
          role="combobox"
          aria-expanded={resultsOpen}
          aria-controls="asta-search-results"
          aria-activedescendant={
            resultsOpen && results[activeIndex] ? `asta-result-${results[activeIndex].id}` : undefined
          }
          className="w-full bg-transparent text-h3 font-normal placeholder:text-ink-3 focus:outline-none"
        />
        {query && (
          <button
            type="button"
            onClick={clearSearch}
            aria-label="Svuota ricerca"
            className="shrink-0 text-ink-3 transition-colors duration-fast ease-standard hover:text-ink"
          >
            <X size={16} />
          </button>
        )}
      </div>

      {resultsOpen && (
        <div id="asta-search-results" role="listbox" className="border-t border-line p-1">
          {results.map((p, i) => (
            <button
              key={p.id}
              id={`asta-result-${p.id}`}
              role="option"
              aria-selected={i === activeIndex}
              onMouseEnter={() => setActiveIndex(i)}
              onClick={() => setSelected(p)}
              className={`flex w-full items-center gap-3 rounded-md px-3 py-2 text-left transition-colors duration-fast ease-standard ${
                i === activeIndex ? "bg-surface-sunk" : ""
              }`}
            >
              <RoleBadge role={p.role} size="sm" />
              <span className="text-body-dense font-semibold">{p.name}</span>
              <span className="ml-auto font-mono text-small-dense text-ink-3">{p.serieATeam}</span>
            </button>
          ))}
          {results.length === 0 && (
            <button
              onClick={() => setAddOpen(true)}
              className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-body-dense text-accent transition-colors duration-fast ease-standard hover:bg-surface-sunk"
            >
              Aggiungi &quot;{query}&quot; al listone
            </button>
          )}
        </div>
      )}

      {selected && (
        <AssignPanel
          key={selected.id}
          player={selected}
          teams={teams}
          roleLimits={roleLimits}
          roleStats={roleStats}
          onClose={closePanel}
          onAssigned={() => {
            clearSearch();
            router.refresh();
          }}
        />
      )}

      <AddPlayerDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        initialName={query}
        onCreated={() => {
          setQuery("");
          router.refresh();
        }}
      />
    </div>
  );
}
