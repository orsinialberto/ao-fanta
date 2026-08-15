import { getFilteredPlayers } from "@/lib/players";
import { getTeamsWithRoster, getDistinctSerieATeams } from "@/lib/teams";
import { getLeagueSettings, getRoleLimit } from "@/lib/leagueSettings";
import { ROLE_ORDER } from "@/lib/roles";
import PageHeader from "@/app/components/PageHeader";
import ListoneToolbar from "./ListoneToolbar";
import PlayersTable from "./PlayersTable";
import { readSearchParams } from "@/lib/filterParams";

export const dynamic = "force-dynamic";

export default async function PlayersPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | undefined }>;
}) {
  const params = await searchParams;
  const filters = readSearchParams(params);

  const [players, teams, serieATeams, leagueSettings] = await Promise.all([
    getFilteredPlayers(filters),
    getTeamsWithRoster(),
    getDistinctSerieATeams(),
    getLeagueSettings(),
  ]);
  const roleLimits = Object.fromEntries(
    ROLE_ORDER.map((r) => [r, getRoleLimit(leagueSettings, r)])
  ) as Record<(typeof ROLE_ORDER)[number], number>;

  return (
    <>
      <PageHeader
        title="Listone"
        subtitle="Tutti i giocatori disponibili, con filtri e assegnazione diretta."
      />
      <ListoneToolbar serieATeams={serieATeams} resultCount={players.length} />
      <PlayersTable
        players={players}
        teams={teams.map((t) => ({ id: t.id, name: t.name, remainingCredits: t.remainingCredits, roleCounts: t.roleCounts }))}
        roleLimits={roleLimits}
      />
    </>
  );
}
