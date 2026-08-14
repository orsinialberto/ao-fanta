import { getFilteredPlayers } from "@/lib/players";
import { getTeamsWithRoster } from "@/lib/teams";
import { getLeagueSettings, getRoleLimit } from "@/lib/leagueSettings";
import { ROLE_ORDER, parseRoleParam, type Role } from "@/lib/roles";
import PlayersTable from "../players/PlayersTable";
import RoleFilter from "./RoleFilter";

export const dynamic = "force-dynamic";

export default async function WatchlistPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | undefined }>;
}) {
  const params = await searchParams;
  const role = parseRoleParam(params.role);

  const [players, teams, leagueSettings] = await Promise.all([
    getFilteredPlayers({ watchlistOnly: true, freeAgentOnly: true, role }),
    getTeamsWithRoster(),
    getLeagueSettings(),
  ]);

  const roleLimits = Object.fromEntries(
    ROLE_ORDER.map((r) => [r, getRoleLimit(leagueSettings, r)])
  ) as Record<Role, number>;

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-[22px] font-extrabold">Wishlist</h1>
      </div>
      <RoleFilter />
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
    </div>
  );
}
