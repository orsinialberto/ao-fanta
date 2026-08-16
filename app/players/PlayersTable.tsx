"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, ChevronUp, Star } from "lucide-react";
import type { PlayerWithTeam, TeamSummary } from "@/lib/types";
import { errorMessage } from "@/lib/http";
import type { Role } from "@/lib/roles";
import { tierSortWeight, type WishlistTier } from "@/lib/wishlist";
import WishlistTierCell from "./WishlistTierCell";
import AssignDialog from "@/app/components/AssignDialog";
import RoleBadge from "@/app/components/RoleBadge";
import EmptyState from "@/app/components/EmptyState";
import InlineError from "@/app/components/InlineError";
import { Users } from "lucide-react";

type SortKey = "name" | "role" | "serieATeam" | "starter" | "fantasyTeam" | "cost" | "wishlistTier";
type SortState = { key: SortKey; dir: "asc" | "desc" };

const ALL_COLUMNS: { key: SortKey; label: string }[] = [
  { key: "name", label: "Nome" },
  { key: "role", label: "Ruolo" },
  { key: "serieATeam", label: "Squadra Serie A" },
  { key: "starter", label: "Titolare" },
  { key: "fantasyTeam", label: "Stato" },
  { key: "cost", label: "Costo" },
  { key: "wishlistTier", label: "Wish" },
];

export default function PlayersTable({
  players,
  teams,
  roleLimits,
  showCost = true,
}: {
  players: PlayerWithTeam[];
  teams: TeamSummary[];
  roleLimits: Record<Role, number>;
  showCost?: boolean;
}) {
  const COLUMNS = showCost ? ALL_COLUMNS : ALL_COLUMNS.filter((c) => c.key !== "cost");
  const router = useRouter();
  const [assigning, setAssigning] = useState<PlayerWithTeam | null>(null);
  const [assignOpen, setAssignOpen] = useState(false);
  const [sort, setSort] = useState<SortState | null>(null);
  const [error, setError] = useState<string | null>(null);

  const sortedPlayers = useMemo(() => {
    if (!sort) return players;

    const sorted = [...players];
    sorted.sort((a, b) => {
      let aVal: string | number | boolean = "";
      let bVal: string | number | boolean = "";

      switch (sort.key) {
        case "name":
          aVal = a.name.toLowerCase();
          bVal = b.name.toLowerCase();
          break;
        case "role":
          aVal = a.role;
          bVal = b.role;
          break;
        case "serieATeam":
          aVal = a.serieATeam.toLowerCase();
          bVal = b.serieATeam.toLowerCase();
          break;
        case "starter":
          aVal = a.starter ? 1 : 0;
          bVal = b.starter ? 1 : 0;
          break;
        case "fantasyTeam":
          aVal = (a.fantasyTeam?.name ?? "").toLowerCase();
          bVal = (b.fantasyTeam?.name ?? "").toLowerCase();
          break;
        case "cost":
          aVal = a.cost ?? 0;
          bVal = b.cost ?? 0;
          break;
        case "wishlistTier":
          aVal = tierSortWeight(a.wishlistTier);
          bVal = tierSortWeight(b.wishlistTier);
          break;
      }

      if (aVal < bVal) return sort.dir === "asc" ? -1 : 1;
      if (aVal > bVal) return sort.dir === "asc" ? 1 : -1;
      return 0;
    });

    return sorted;
  }, [players, sort]);

  function toggleSort(key: SortKey) {
    setSort((current) => {
      if (current?.key === key) {
        return { key, dir: current.dir === "asc" ? "desc" : "asc" };
      }
      return { key, dir: "asc" };
    });
  }

  function SortIcon({ column }: { column: SortKey }) {
    if (sort?.key !== column) return null;
    const Icon = sort.dir === "asc" ? ChevronUp : ChevronDown;
    return <Icon size={10} className="ml-[3px] inline-block align-[-1px] text-accent" />;
  }

  async function setTier(player: PlayerWithTeam, tier: WishlistTier | null) {
    const res = await fetch(`/api/players/${player.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ wishlistTier: tier }),
    });
    if (!res.ok) {
      setError(await errorMessage(res));
      return;
    }
    setError(null);
    router.refresh();
  }

  async function unassign(player: PlayerWithTeam) {
    const res = await fetch(`/api/players/${player.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fantasyTeamId: null }),
    });
    if (!res.ok) {
      setError(await errorMessage(res));
      return;
    }
    setError(null);
    router.refresh();
  }

  return (
    <>
      {error && (
        <div className="mb-3">
          <InlineError message={error} />
        </div>
      )}
      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] border-collapse text-small">
          <thead>
            <tr>
              {COLUMNS.map((col) => (
                <th
                  key={col.key}
                  onClick={() => toggleSort(col.key)}
                  className="sticky top-14 z-10 cursor-pointer select-none whitespace-nowrap border-b border-line bg-paper px-3 py-3 text-left text-label uppercase text-ink-3 transition-colors duration-fast ease-standard hover:text-ink-2 md:top-0"
                >
                  {col.label}
                  <SortIcon column={col.key} />
                </th>
              ))}
              <th className="sticky top-14 z-10 border-b border-line bg-paper px-3 py-3 md:top-0" />
            </tr>
          </thead>
          <tbody className="[&>tr:last-child>td]:border-b-0">
            {sortedPlayers.map((p) => (
              <tr key={p.id} className="group transition-colors duration-fast ease-standard hover:bg-surface-sunk">
                <td className="h-11 border-b border-line px-3 align-middle font-semibold">
                  {p.name}
                </td>
                <td className="h-11 w-px border-b border-line px-3 align-middle">
                  <RoleBadge role={p.role} size="sm" />
                </td>
                <td className="h-11 border-b border-line px-3 align-middle text-ink-2">
                  {p.serieATeam}
                </td>
                <td className="h-11 border-b border-line px-3 align-middle">
                  <span
                    title="Titolare"
                    className={`inline-flex items-center ${p.starter ? "text-role-c" : "text-ink-3"}`}
                  >
                    <Star size={16} fill={p.starter ? "currentColor" : "none"} />
                  </span>
                </td>
                <td className="h-11 border-b border-line px-3 align-middle">
                  <span
                    className={`inline-flex items-center rounded-full px-2 py-px text-small-dense font-medium ${
                      p.fantasyTeam
                        ? "bg-accent-bg text-accent"
                        : "border border-line bg-surface-sunk text-ink-3"
                    }`}
                  >
                    {p.fantasyTeam ? p.fantasyTeam.name : "Svincolato"}
                  </span>
                </td>
                {showCost && (
                  <td className="h-11 border-b border-line px-3 align-middle font-mono font-medium tabular-nums">
                    {p.cost ?? "—"}
                  </td>
                )}
                <td className="h-11 border-b border-line px-3 align-middle">
                  <WishlistTierCell
                    value={p.wishlistTier}
                    onChange={(tier) => setTier(p, tier)}
                  />
                </td>
                <td className="h-11 w-px whitespace-nowrap border-b border-line px-3 text-right align-middle">
                  {p.fantasyTeam ? (
                    <button
                      type="button"
                      onClick={() => unassign(p)}
                      className="text-small-dense font-semibold text-ink-3 opacity-0 transition-[opacity,color] duration-fast ease-standard hover:text-danger group-hover:opacity-100 focus-visible:opacity-100"
                    >
                      Svincola
                    </button>
                  ) : teams.length > 0 ? (
                    <button
                      type="button"
                      onClick={() => {
                        setAssigning(p);
                        setAssignOpen(true);
                      }}
                      className="text-small-dense font-semibold text-accent opacity-0 transition-opacity duration-fast ease-standard group-hover:opacity-100 focus-visible:opacity-100"
                    >
                      Assegna
                    </button>
                  ) : (
                    <span className="text-small-dense text-ink-3">Crea prima una squadra</span>
                  )}
                </td>
              </tr>
            ))}
            {sortedPlayers.length === 0 && (
              <tr>
                <td colSpan={COLUMNS.length + 1} className="px-3 py-6">
                  <EmptyState
                    icon={Users}
                    title="Nessun giocatore da mostrare"
                    description="Nessun risultato per questi filtri. Prova ad azzerarli o a importare il listone da Impostazioni."
                  />
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <AssignDialog
        player={assigning}
        teams={teams}
        roleLimits={roleLimits}
        open={assignOpen}
        onOpenChange={setAssignOpen}
        onAssigned={() => {
          setAssignOpen(false);
          router.refresh();
        }}
      />
    </>
  );
}
