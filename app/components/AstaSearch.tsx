"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import AssignDialog from "@/app/components/AssignDialog";
import AddPlayerDialog from "@/app/components/AddPlayerDialog";
import RoleBadge from "@/app/components/RoleBadge";
import type { PlayerWithTeam, TeamSummary } from "@/lib/types";
import type { Role } from "@/lib/roles";

const DEBOUNCE_MS = 200;

export default function AstaSearch({
  teams,
  roleLimits,
}: {
  teams: TeamSummary[];
  roleLimits: Record<Role, number>;
}) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<PlayerWithTeam[]>([]);
  const [assigning, setAssigning] = useState<PlayerWithTeam | null>(null);
  const [assignOpen, setAssignOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

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

  function openAssign(player: PlayerWithTeam) {
    setAssigning(player);
    setAssignOpen(true);
  }

  const dropdownOpen = query.trim().length > 0;

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!dropdownOpen) return;

    if (e.key === "Escape") {
      e.preventDefault();
      setQuery("");
      return;
    }
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
      else if (results[activeIndex]) openAssign(results[activeIndex]);
    }
  }

  return (
    <div className="overflow-hidden rounded-lg border border-line-strong bg-surface">
      <div className="flex items-center gap-3 px-4 py-3">
        <Search className="pointer-events-none shrink-0 text-ink-3" size={17} />
        <input
          autoFocus
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Cerca per nome giocatore…"
          role="combobox"
          aria-expanded={dropdownOpen}
          aria-controls="asta-search-results"
          aria-activedescendant={
            dropdownOpen && results[activeIndex] ? `asta-result-${results[activeIndex].id}` : undefined
          }
          className="w-full bg-transparent text-h3 font-normal placeholder:text-ink-3 focus:outline-none"
        />
        <span className="shrink-0 rounded-sm border border-line px-2 py-px font-mono text-small-dense text-ink-3">
          ↑↓ · ⏎ assegna · esc
        </span>
      </div>

      {dropdownOpen && (
        <div id="asta-search-results" role="listbox" className="border-t border-line p-1">
          {results.map((p, i) => (
            <button
              key={p.id}
              id={`asta-result-${p.id}`}
              role="option"
              aria-selected={i === activeIndex}
              onMouseEnter={() => setActiveIndex(i)}
              onClick={() => openAssign(p)}
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

      <AssignDialog
        player={assigning}
        teams={teams}
        roleLimits={roleLimits}
        open={assignOpen}
        onOpenChange={setAssignOpen}
        onAssigned={() => {
          setAssignOpen(false);
          setQuery("");
          router.refresh();
        }}
      />
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
