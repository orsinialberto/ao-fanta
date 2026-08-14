import { getFilteredPlayers } from "@/lib/players";
import { getTeamsWithRoster } from "@/lib/teams";
import PlayersTable from "../players/PlayersTable";

export const dynamic = "force-dynamic";

export default async function WatchlistPage() {
  const [players, teams] = await Promise.all([
    getFilteredPlayers({ watchlistOnly: true, freeAgentOnly: true }),
    getTeamsWithRoster(),
  ]);

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Watchlist</h1>
      <PlayersTable
        players={players}
        teams={teams.map((t) => ({ id: t.id, name: t.name, remainingCredits: t.remainingCredits }))}
      />
    </div>
  );
}
