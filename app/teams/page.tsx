import { getTeamsWithRoster } from "@/lib/teams";
import TeamForm from "./TeamForm";
import DeleteTeamButton from "./DeleteTeamButton";

export const dynamic = "force-dynamic";

const ROLE_ORDER = ["GK", "DEF", "MID", "FWD"] as const;
const ROLE_LABELS: Record<string, string> = {
  GK: "Portieri",
  DEF: "Difensori",
  MID: "Centrocampisti",
  FWD: "Attaccanti",
};

export default async function TeamsPage() {
  const teams = await getTeamsWithRoster();

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Squadre</h1>
        <TeamForm mode="create" />
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
              </div>
              <TeamForm mode="edit" team={team} />
              <DeleteTeamButton teamId={team.id} disabled={team.players.length > 0} />
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
                      <span>
                        {p.name} <span className="text-gray-400 text-sm">({p.serieATeam})</span>
                      </span>
                      <span className="font-medium">{p.cost}</span>
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
