"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import AssignDialog from "@/app/components/AssignDialog";
import AddPlayerDialog from "@/app/components/AddPlayerDialog";
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
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      return;
    }
    clearTimeout(timer.current);
    timer.current = setTimeout(async () => {
      const res = await fetch(`/api/players?search=${encodeURIComponent(query)}&freeAgentOnly=true`);
      if (res.ok) setResults(await res.json());
    }, DEBOUNCE_MS);
    return () => clearTimeout(timer.current);
  }, [query]);

  return (
    <div className="rounded-[20px] border border-border bg-surface p-5 shadow-sm">
      <div className="mb-3 flex items-center gap-2 text-[13px] font-bold text-ink-dim">
        <Search size={15} strokeWidth={1.8} />
        Chi è in asta?
      </div>
      <div className="relative">
        <Search className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-dim/50" size={18} />
        <input
          autoFocus
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Cerca per nome giocatore…"
          className="w-full rounded-[13px] border-[1.5px] border-border bg-surface-2 py-3.5 pl-11 pr-4 text-base focus:border-indigo focus:bg-surface focus:outline-none"
        />
      </div>

      {query.trim() && (
        <div className="mt-2.5 border-t border-border pt-1">
          {results.map((p) => (
            <button
              key={p.id}
              onClick={() => {
                setAssigning(p);
                setAssignOpen(true);
              }}
              className="flex w-full items-center gap-3 rounded-lg px-1.5 py-2.5 text-left hover:bg-surface-2"
            >
              <span className="flex h-6.5 w-6.5 flex-shrink-0 items-center justify-center rounded-lg bg-ink text-[11px] font-extrabold text-white">
                {p.role}
              </span>
              <span className="flex-1">
                <span className="block text-sm font-bold">{p.name}</span>
                <span className="block text-[11.5px] text-ink-dim">{p.serieATeam}</span>
              </span>
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
