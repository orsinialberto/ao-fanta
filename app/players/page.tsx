import { getFilteredPlayers } from "@/lib/players";
import { getTeamsWithRoster, getDistinctSerieATeams } from "@/lib/teams";
import { getLeagueSettings, getRoleLimit } from "@/lib/leagueSettings";
import { ROLE_ORDER, type Role, parseRoleParam } from "@/lib/roles";
import PlayerFilters from "./PlayerFilters";
import PlayersTable from "./PlayersTable";

export const dynamic = "force-dynamic";

export default async function PlayersPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | undefined }>;
}) {
  const params = await searchParams;
  const filters = {
    role: parseRoleParam(params.role),
    serieATeam: params.serieATeam,
    freeAgentOnly: params.freeAgentOnly === "true",
    starterOnly: params.starterOnly === "true",
    watchlistOnly: params.watchlistOnly === "true",
    search: params.search,
  };

  const [players, teams, serieATeams, leagueSettings] = await Promise.all([
    getFilteredPlayers(filters),
    getTeamsWithRoster(),
    getDistinctSerieATeams(),
    getLeagueSettings(),
  ]);

  const roleLimits = Object.fromEntries(
    ROLE_ORDER.map((r) => [r, getRoleLimit(leagueSettings, r)])
  ) as Record<Role, number>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Giocatori</h1>
      </div>
      <PlayerFilters serieATeams={serieATeams} />
      <PlayersTable
        players={players}
        teams={teams.map((t) => ({
          id: t.id,
          name: t.name,
          remainingCredits: t.remainingCredits,
          roleCounts: t.roleCounts,
        }))}
        roleLimits={roleLimits}
      />
    </div>
  );
}
