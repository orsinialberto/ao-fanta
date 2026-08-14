import Link from "next/link";
import { getFilteredPlayers } from "@/lib/players";
import { getTeamsWithRoster, getDistinctSerieATeams } from "@/lib/teams";
import PlayerFilters from "./PlayerFilters";
import PlayersTable from "./PlayersTable";
import AddPlayerForm from "./AddPlayerForm";
import WipePlayersButton from "./WipePlayersButton";

export const dynamic = "force-dynamic";

export default async function PlayersPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | undefined }>;
}) {
  const params = await searchParams;
  const filters = {
    role: params.role,
    serieATeam: params.serieATeam,
    freeAgentOnly: params.freeAgentOnly === "true",
    starterOnly: params.starterOnly === "true",
    watchlistOnly: params.watchlistOnly === "true",
    search: params.search,
  };

  const [players, teams, serieATeams] = await Promise.all([
    getFilteredPlayers(filters),
    getTeamsWithRoster(),
    getDistinctSerieATeams(),
  ]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Giocatori</h1>
        <div className="flex gap-2">
          <Link href="/players/import" className="px-3 py-1.5 border rounded text-sm">
            Import
          </Link>
          <AddPlayerForm />
          <WipePlayersButton />
        </div>
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
      />
    </div>
  );
}
