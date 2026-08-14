"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { ROLE_ORDER } from "@/lib/roles";
const DEBOUNCE_MS = 250;

export default function PlayerFilters({ serieATeams }: { serieATeams: string[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Text inputs are controlled so that Back/Forward navigation (which
  // changes searchParams without the input ever firing onChange) updates
  // what's displayed, not just what's applied.
  const [search, setSearch] = useState(searchParams.get("search") ?? "");

  useEffect(() => {
    setSearch(searchParams.get("search") ?? "");
  }, [searchParams]);

  // Per-field debounce timers (keyed by filter key) so typing in one text
  // input never cancels a pending commit from the other — a single shared
  // timer would let a click into serieATeam wipe out an in-flight search
  // update before it ever reached the URL.
  const debounceTimers = useRef(new Map<string, ReturnType<typeof setTimeout>>());

  function update(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    // replace (not push) so text-input edits don't create one history
    // entry per keystroke.
    router.replace(`${pathname}?${params.toString()}`);
  }

  function updateDebounced(key: string, value: string) {
    const existing = debounceTimers.current.get(key);
    if (existing) clearTimeout(existing);
    debounceTimers.current.set(
      key,
      setTimeout(() => update(key, value), DEBOUNCE_MS)
    );
  }

  function toggle(key: string) {
    const current = searchParams.get(key) === "true";
    update(key, current ? "" : "true");
  }

  return (
    <div className="flex flex-wrap gap-3 items-center border rounded p-3">
      <input
        placeholder="Cerca per nome"
        value={search}
        onChange={(e) => {
          setSearch(e.target.value);
          updateDebounced("search", e.target.value);
        }}
        className="border rounded px-2 py-1 text-sm"
      />
      <select
        defaultValue={searchParams.get("role") ?? ""}
        onChange={(e) => update("role", e.target.value)}
        className="border rounded px-2 py-1 text-sm"
      >
        <option value="">Tutti i ruoli</option>
        {ROLE_ORDER.map((r) => (
          <option key={r} value={r}>
            {r}
          </option>
        ))}
      </select>
      <select
        value={searchParams.get("serieATeam") ?? ""}
        onChange={(e) => update("serieATeam", e.target.value)}
        className="border rounded px-2 py-1 text-sm"
      >
        <option value="">Tutte le squadre</option>
        {serieATeams.map((team) => (
          <option key={team} value={team}>
            {team}
          </option>
        ))}
      </select>
      <label className="text-sm flex items-center gap-1">
        <input
          type="checkbox"
          checked={searchParams.get("freeAgentOnly") === "true"}
          onChange={() => toggle("freeAgentOnly")}
        />
        Solo svincolati
      </label>
      <label className="text-sm flex items-center gap-1">
        <input
          type="checkbox"
          checked={searchParams.get("starterOnly") === "true"}
          onChange={() => toggle("starterOnly")}
        />
        Solo titolari
      </label>
      <label className="text-sm flex items-center gap-1">
        <input
          type="checkbox"
          checked={searchParams.get("watchlistOnly") === "true"}
          onChange={() => toggle("watchlistOnly")}
        />
        Solo watchlist
      </label>
    </div>
  );
}
