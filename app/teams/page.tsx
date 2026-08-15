import { getTeamsWithRoster } from "@/lib/teams";
import { ROLE_ORDER } from "@/lib/roles";
import { getLeagueSettings, getRoleLimit } from "@/lib/leagueSettings";
import PageHeader from "@/app/components/PageHeader";
import EmptyState from "@/app/components/EmptyState";
import { Users } from "lucide-react";
import TeamCard from "./TeamCard";

export const dynamic = "force-dynamic";

export default async function TeamsPage() {
  const [teams, leagueSettings] = await Promise.all([
    getTeamsWithRoster(),
    getLeagueSettings(),
  ]);

  const roleLimits = Object.fromEntries(
    ROLE_ORDER.map((r) => [r, getRoleLimit(leagueSettings, r)])
  ) as Record<(typeof ROLE_ORDER)[number], number>;

  return (
    <>
      <PageHeader
        title="Squadre"
        subtitle="Passa il mouse su un giocatore per rilasciarlo."
      />

      {teams.length === 0 && (
        <EmptyState
          icon={Users}
          title="Nessuna squadra"
          description="Crea la prima squadra in Impostazioni per iniziare l'asta."
        />
      )}

      <div className="grid grid-cols-[repeat(auto-fill,minmax(260px,1fr))] gap-4">
        {teams.map((team) => (
          <TeamCard key={team.id} team={team} roleLimits={roleLimits} />
        ))}
      </div>
    </>
  );
}
