import { getTeamsWithRoster } from "@/lib/teams";
import { ROLE_ORDER } from "@/lib/roles";
import { getLeagueSettings, getRoleLimit } from "@/lib/leagueSettings";
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
    <div className="space-y-7">
      <div>
        <h1 className="text-[22px] font-extrabold">Squadre</h1>
      </div>

      <div className="grid grid-cols-4 gap-4">
        {teams.map((team) => (
          <TeamCard key={team.id} team={team} roleLimits={roleLimits} />
        ))}
      </div>
    </div>
  );
}
