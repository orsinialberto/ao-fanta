import { getTeamsWithRoster } from "@/lib/teams";
import { ROLE_ORDER, ROLE_LABELS } from "@/lib/roles";
import { getLeagueSettings, getRoleLimit } from "@/lib/leagueSettings";
import TeamForm from "./TeamForm";
import ReleasePlayerButton from "./ReleasePlayerButton";
import ReleaseAllButton from "./ReleaseAllButton";

export const dynamic = "force-dynamic";

export default async function TeamsPage() {
  const [teams, leagueSettings] = await Promise.all([
    getTeamsWithRoster(),
    getLeagueSettings(),
  ]);

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Squadre</h1>
      </div>

      {teams.map((team) => (
        <section key={team.id} className="border rounded-lg p-4">
          <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
            <div>
              <h2 className="text-xl font-semibold">{team.name}</h2>
              <p className="text-sm text-gray-500">Allenatore: {team.coach}</p>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right">
                <p className="text-sm text-gray-500">
                  Spesi: {team.spentCredits} / {team.totalCredits}
                </p>
                <p className="font-semibold">Residui: {team.remainingCredits}</p>
                <p className="text-sm text-gray-500 space-x-2">
                  {ROLE_ORDER.map((role) => (
                    <span key={role} title={ROLE_LABELS[role]}>
                      {role} {team.roleCounts[role]}/{getRoleLimit(leagueSettings, role)}
                    </span>
                  ))}
                </p>
              </div>
              <TeamForm mode="edit" team={team} />
              <ReleaseAllButton
                teamId={team.id}
                teamName={team.name}
                isDisabled={team.players.length === 0}
              />
            </div>
          </div>

          {ROLE_ORDER.map((role) => {
            const rolePlayers = team.players.filter((p) => p.role === role);
            if (rolePlayers.length === 0) return null;
            return (
              <div key={role} className="mt-3">
                <h3 className="text-sm font-medium text-gray-600">{ROLE_LABELS[role]}</h3>
                <ul className="divide-y">
                  {rolePlayers.map((p) => (
                    <li key={p.id} className="flex justify-between py-1">
                      <div>
                        <span>
                          {p.name} <span className="text-gray-400 text-sm">({p.serieATeam})</span>
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{p.cost}</span>
                        <ReleasePlayerButton playerId={p.id} playerName={p.name} />
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
          {team.players.length === 0 && (
            <p className="text-gray-400 text-sm mt-2">Nessun giocatore assegnato.</p>
          )}
        </section>
      ))}
    </div>
  );
}
