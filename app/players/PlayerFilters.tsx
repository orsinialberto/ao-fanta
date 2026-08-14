"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";

const ROLES = ["GK", "DEF", "MID", "FWD"];

export default function PlayerFilters() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function update(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    router.push(`${pathname}?${params.toString()}`);
  }

  function toggle(key: string) {
    const current = searchParams.get(key) === "true";
    update(key, current ? "" : "true");
  }

  return (
    <div className="flex flex-wrap gap-3 items-center border rounded p-3">
      <input
        placeholder="Cerca per nome"
        defaultValue={searchParams.get("search") ?? ""}
        onChange={(e) => update("search", e.target.value)}
        className="border rounded px-2 py-1 text-sm"
      />
      <select
        defaultValue={searchParams.get("role") ?? ""}
        onChange={(e) => update("role", e.target.value)}
        className="border rounded px-2 py-1 text-sm"
      >
        <option value="">Tutti i ruoli</option>
        {ROLES.map((r) => (
          <option key={r} value={r}>
            {r}
          </option>
        ))}
      </select>
      <input
        placeholder="Squadra Serie A"
        defaultValue={searchParams.get("serieATeam") ?? ""}
        onChange={(e) => update("serieATeam", e.target.value)}
        className="border rounded px-2 py-1 text-sm"
      />
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
