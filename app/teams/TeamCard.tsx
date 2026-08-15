import { ROLE_ORDER, ROLE_LABELS, type Role } from "@/lib/roles";
import { rolePillClass } from "@/lib/roleStyles";
import { spendPercent } from "@/lib/credits";
import ReleasePlayerButton from "./ReleasePlayerButton";
import type { getTeamsWithRoster } from "@/lib/teams";

type Team = Awaited<ReturnType<typeof getTeamsWithRoster>>[number];

export default function TeamCard({
  team,
  roleLimits,
}: {
  team: Team;
  roleLimits: Record<Role, number>;
}) {
  return (
    <div className="flex flex-col gap-4 rounded-lg border border-line bg-surface p-4 transition-colors duration-base ease-standard hover:border-line-strong">
      <div>
        <h2 className="text-h2">{team.name}</h2>
        <p className="text-small text-ink-3">{team.coach}</p>
      </div>

      <div>
        <div className="flex items-baseline justify-between font-mono tabular-nums">
          <span className="text-h2 font-medium">{team.remainingCredits}</span>
          <span className="text-small-dense text-ink-3">di {team.totalCredits} crediti</span>
        </div>
        <div className="mt-2 h-[2px] overflow-hidden rounded-full bg-line">
          <div
            className="h-full rounded-full bg-accent transition-[width] duration-[400ms] ease-standard"
            style={{ width: `${spendPercent(team.spentCredits, team.totalCredits)}%` }}
          />
        </div>
      </div>

      <div className="flex flex-col gap-4">
        {ROLE_ORDER.map((role) => {
          const rolePlayers = team.players.filter((p) => p.role === role);
          return (
            <div key={role}>
              <div className="mb-1 flex items-center justify-between gap-2 border-b border-line pb-1">
                <h3 className="text-label uppercase text-ink-3">{ROLE_LABELS[role]}</h3>
                <span
                  className={`rounded-sm px-2 py-px font-mono text-small-dense font-medium tabular-nums ${rolePillClass(
                    role,
                    team.roleCounts[role],
                    roleLimits[role]
                  )}`}
                >
                  {role} {team.roleCounts[role]}/{roleLimits[role]}
                </span>
              </div>
              {rolePlayers.length > 0 ? (
                <ul className="flex flex-col gap-px">
                  {rolePlayers.map((p) => (
                    <li
                      key={p.id}
                      className="group flex items-center justify-between gap-2 py-px text-small"
                    >
                      <span className="min-w-0 truncate font-medium">{p.name}</span>
                      <span className="flex shrink-0 items-center gap-2">
                        <span className="font-mono text-small-dense font-medium tabular-nums text-ink-2">
                          {p.cost}
                        </span>
                        <span className="opacity-0 transition-opacity duration-fast ease-standard group-hover:opacity-100 focus-within:opacity-100">
                          <ReleasePlayerButton playerId={p.id} playerName={p.name} />
                        </span>
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-small-dense text-ink-3">Nessuno.</p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
