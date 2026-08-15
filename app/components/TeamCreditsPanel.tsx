import { ROLE_ORDER, type Role } from "@/lib/roles";
import { rolePillClass } from "@/lib/roleStyles";
import { spendPercent } from "@/lib/credits";

export type TeamCredits = {
  id: string;
  name: string;
  remainingCredits: number;
  totalCredits: number;
  spentCredits: number;
  roleCounts: Record<Role, number>;
};

export default function TeamCreditsPanel({
  teams,
  roleLimits,
}: {
  teams: TeamCredits[];
  roleLimits: Record<Role, number>;
}) {
  return (
    <aside className="sticky top-10">
      <div className="mb-3 flex items-baseline justify-between">
        <h2 className="text-label uppercase text-ink-3">Crediti squadre</h2>
        <span className="font-mono text-small-dense tabular-nums text-ink-3">{teams.length}</span>
      </div>

      <div className="rounded-lg border border-line bg-surface px-4">
        {teams.length === 0 && (
          <p className="py-4 text-small-dense text-ink-3">
            Nessuna squadra — creane una in Impostazioni.
          </p>
        )}

        {teams.map((team) => (
          <div key={team.id} className="border-b border-line py-3 last:border-b-0">
            <div className="flex items-baseline justify-between gap-3">
              <span className="text-body-dense font-semibold">{team.name}</span>
              <span className="font-mono text-body-dense font-semibold tabular-nums">
                {team.remainingCredits}
                <span className="text-small-dense font-medium text-ink-3">/{team.totalCredits}</span>
              </span>
            </div>

            <div className="my-2 h-[2px] overflow-hidden rounded-full bg-line">
              <div
                className="h-full rounded-full bg-accent transition-[width] duration-500 ease-standard"
                style={{ width: `${spendPercent(team.spentCredits, team.totalCredits)}%` }}
              />
            </div>

            <div className="flex gap-1">
              {ROLE_ORDER.map((role) => (
                <span
                  key={role}
                  className={`rounded-sm px-2 py-px font-mono text-small-dense font-medium tabular-nums ${rolePillClass(
                    role,
                    team.roleCounts[role],
                    roleLimits[role]
                  )}`}
                >
                  {role} {team.roleCounts[role]}/{roleLimits[role]}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>
    </aside>
  );
}
