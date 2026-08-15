import { getFilteredPlayers } from "@/lib/players";
import { getTeamsWithRoster, getDistinctSerieATeams } from "@/lib/teams";
import { getLeagueSettings, getRoleLimit } from "@/lib/leagueSettings";
import { ROLE_ORDER, type Role } from "@/lib/roles";
import { readSearchParams } from "@/lib/filterParams";
import PageHeader from "@/app/components/PageHeader";
import ListoneToolbar from "../players/ListoneToolbar";
import PlayersTable from "../players/PlayersTable";

export const dynamic = "force-dynamic";

export default async function WatchlistPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | undefined }>;
}) {
  const params = await searchParams;
  const filters = readSearchParams(params);

  const [players, teams, serieATeams, leagueSettings] = await Promise.all([
    // The route is the filter: only free agents, only watchlisted, always.
    getFilteredPlayers({
      ...filters,
      watchlistOnly: true,
      freeAgentOnly: true,
      starterOnly: false,
    }),
    getTeamsWithRoster(),
    getDistinctSerieATeams(),
    getLeagueSettings(),
  ]);

  const roleLimits = Object.fromEntries(
    ROLE_ORDER.map((r) => [r, getRoleLimit(leagueSettings, r)])
  ) as Record<Role, number>;

  return (
    <>
      <PageHeader
        title="Wishlist"
        subtitle="Solo svincolati. Togli la stella per rimuoverli."
      />
      <ListoneToolbar
        serieATeams={serieATeams}
        resultCount={players.length}
        showStatusToggles={false}
      />
      <PlayersTable
        players={players}
        teams={teams.map((t) => ({
          id: t.id,
          name: t.name,
          remainingCredits: t.remainingCredits,
          roleCounts: t.roleCounts,
        }))}
        roleLimits={roleLimits}
        showCost={false}
      />
    </>
  );
}
