import { getRecentAcquisitions } from "@/lib/players";
import { getTeamsWithRoster } from "@/lib/teams";
import { getLeagueSettings, getRoleLimit } from "@/lib/leagueSettings";
import { ROLE_ORDER, type Role } from "@/lib/roles";
import { groupByDay } from "@/lib/dates";
import PageHeader from "@/app/components/PageHeader";
import EmptyState from "@/app/components/EmptyState";
import AstaSearch from "@/app/components/AstaSearch";
import TeamCreditsPanel from "@/app/components/TeamCreditsPanel";
import RoleBadge from "@/app/components/RoleBadge";
import { Gavel } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function AstaPage() {
  const [teams, leagueSettings, recent] = await Promise.all([
    getTeamsWithRoster(),
    getLeagueSettings(),
    getRecentAcquisitions(8),
  ]);

  const roleLimits = Object.fromEntries(
    ROLE_ORDER.map((r) => [r, getRoleLimit(leagueSettings, r)])
  ) as Record<Role, number>;

  const rosterSize = ROLE_ORDER.reduce((sum, r) => sum + roleLimits[r], 0);
  const assigned = teams.reduce(
    (sum, t) => sum + ROLE_ORDER.reduce((n, r) => n + t.roleCounts[r], 0),
    0
  );

  const recentByDay = groupByDay(recent, (p) => p.assignedAt);

  return (
    <>
      <PageHeader
        title="Asta"
        subtitle={`${assigned} di ${teams.length * rosterSize} giocatori assegnati · ${
          teams.length
        } squadre in gioco`}
      />

      <div className="grid grid-cols-1 items-start gap-8 text-body-dense lg:grid-cols-[1fr_296px]">
        <div>
          <AstaSearch
            teams={teams.map((t) => ({
              id: t.id,
              name: t.name,
              remainingCredits: t.remainingCredits,
              roleCounts: t.roleCounts,
            }))}
            roleLimits={roleLimits}
          />

          <section className="mt-6">
            {recent.length === 0 && (
              <EmptyState
                icon={Gavel}
                title="Nessun acquisto ancora"
                description="Cerca un giocatore qui sopra e assegnalo per far partire l'asta."
              />
            )}

            {recentByDay.map((group) => (
              <div key={group.label} className="mb-6 last:mb-0">
                <div className="mb-2 flex items-center gap-3">
                  <span className="text-label uppercase text-ink-3">{group.label}</span>
                  <span className="h-px flex-1 bg-line" />
                  <span className="font-mono font-medium text-small-dense tabular-nums text-ink-3">
                    {group.items.length}
                  </span>
                </div>
                {group.items.map((p) => (
                  <div
                    key={p.id}
                    className="flex items-center gap-3 border-b border-line py-2 transition-colors duration-fast ease-standard last:border-b-0 hover:bg-surface-sunk"
                  >
                    <RoleBadge role={p.role} size="sm" />
                    <span className="min-w-0 truncate font-medium">{p.name}</span>
                    <span className="ml-auto shrink-0 text-small-dense text-ink-2">
                      {p.fantasyTeam?.name}
                    </span>
                    <span className="shrink-0 font-mono font-medium tabular-nums">{p.cost}</span>
                  </div>
                ))}
              </div>
            ))}
          </section>
        </div>

        <TeamCreditsPanel
          teams={teams.map((t) => ({
            id: t.id,
            name: t.name,
            remainingCredits: t.remainingCredits,
            totalCredits: t.totalCredits,
            spentCredits: t.spentCredits,
            roleCounts: t.roleCounts,
          }))}
          roleLimits={roleLimits}
        />
      </div>
    </>
  );
}
