import { getFilteredPlayers } from "@/lib/players";
import { getTeamsWithRoster } from "@/lib/teams";
import { getLeagueSettings, getRoleLimit } from "@/lib/leagueSettings";
import { ROLE_ORDER, type Role } from "@/lib/roles";
import PlayersTable from "../players/PlayersTable";

export const dynamic = "force-dynamic";

export default async function WatchlistPage() {
  const [players, teams, leagueSettings] = await Promise.all([
    getFilteredPlayers({ watchlistOnly: true, freeAgentOnly: true }),
    getTeamsWithRoster(),
    getLeagueSettings(),
  ]);

  const roleLimits = Object.fromEntries(
    ROLE_ORDER.map((r) => [r, getRoleLimit(leagueSettings, r)])
  ) as Record<Role, number>;

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Watchlist</h1>
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
