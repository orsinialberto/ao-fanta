import { getFilteredPlayers } from "@/lib/players";
import { getTeamsWithRoster, getDistinctSerieATeams } from "@/lib/teams";
import { getLeagueSettings, getRoleLimit } from "@/lib/leagueSettings";
import { ROLE_ORDER, parseRoleParam } from "@/lib/roles";
import PlayerSearchBar from "./PlayerSearchBar";
import FilterPanel from "./FilterPanel";
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
  ) as Record<(typeof ROLE_ORDER)[number], number>;

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-[22px] font-extrabold">Listone</h1>
      </div>
      <PlayerSearchBar />
      <FilterPanel serieATeams={serieATeams} resultCount={players.length} />
      <PlayersTable
        players={players}
        teams={teams.map((t) => ({ id: t.id, name: t.name, remainingCredits: t.remainingCredits, roleCounts: t.roleCounts }))}
        roleLimits={roleLimits}
      />
    </div>
  );
}
