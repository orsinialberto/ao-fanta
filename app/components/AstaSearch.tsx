"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronRight, Search } from "lucide-react";
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
    <div className="rounded-[20px] border border-border bg-surface p-5 shadow-sm">
      <div className="relative">
        <Search className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-faint" size={18} />
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
          className="w-full rounded-[13px] border-[1.5px] border-border bg-surface-2 py-3.5 pl-11 pr-4 text-base focus:border-indigo focus:bg-surface focus:outline-none"
        />
      </div>

      {dropdownOpen && (
        <div id="asta-search-results" role="listbox" className="mt-2.5 border-t border-border pt-1">
          {results.map((p, i) => (
            <button
              key={p.id}
              id={`asta-result-${p.id}`}
              role="option"
              aria-selected={i === activeIndex}
              onMouseEnter={() => setActiveIndex(i)}
              onClick={() => openAssign(p)}
              className={`flex w-full items-center gap-3 rounded-lg px-1.5 py-2.5 text-left ${
                i === activeIndex ? "bg-surface-2" : ""
              }`}
            >
              <RoleBadge role={p.role} />
              <span className="flex-1">
                <span className="block text-sm font-bold">{p.name}</span>
                <span className="block text-[11.5px] text-ink-dim">{p.serieATeam}</span>
              </span>
              <ChevronRight size={16} className="flex-shrink-0 text-ink-faint" />
            </button>
          ))}
          {results.length === 0 && (
            <button
              onClick={() => setAddOpen(true)}
              className="flex w-full items-center gap-2 rounded-lg px-1.5 py-2.5 text-left text-sm text-indigo hover:bg-surface-2"
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
