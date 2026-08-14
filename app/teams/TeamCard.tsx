import { ROLE_ORDER, ROLE_LABELS, type Role } from "@/lib/roles";
import { ROLE_PILL_BG } from "@/lib/roleStyles";
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
    <div className="flex flex-col gap-3.5 rounded-2xl border border-border bg-surface p-[18px] shadow-sm">
      <div className="flex items-baseline gap-1.5">
        <h2 className="text-[14.5px] font-extrabold">{team.name}</h2>
        <span className="text-xs text-ink-dim">{team.coach}</span>
      </div>

      <div className="font-mono text-[13px] font-bold tabular-nums">
        {team.remainingCredits}
        <span className="text-ink-dim"> / {team.totalCredits}</span>
      </div>

      <div className="flex flex-col gap-3">
        {ROLE_ORDER.map((role) => {
          const rolePlayers = team.players.filter((p) => p.role === role);
          return (
            <div key={role}>
              <div className="mb-1 flex items-center justify-between gap-1.5">
                <h3 className="text-[10.5px] font-bold uppercase tracking-[0.04em] text-ink-faint">
                  {ROLE_LABELS[role]}
                </h3>
                <span
                  className={`rounded-lg px-2 py-0.5 text-center font-mono text-[10.5px] font-bold tabular-nums ${ROLE_PILL_BG[role]}`}
                >
                  {role} {team.roleCounts[role]}/{roleLimits[role]}
                </span>
              </div>
              {rolePlayers.length > 0 ? (
                <ul className="flex flex-col gap-0.5">
                  {rolePlayers.map((p) => (
                    <li key={p.id} className="flex items-center justify-between gap-2 py-0.5">
                      <span className="min-w-0 truncate text-[12.5px] font-bold">{p.name}</span>
                      <span className="flex flex-shrink-0 items-center gap-2">
                        <span className="font-mono text-[12px] font-bold tabular-nums">{p.cost}</span>
                        <ReleasePlayerButton playerId={p.id} playerName={p.name} />
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-[11px] text-ink-dim">Nessuno.</p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
