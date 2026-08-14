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
      <div>
        <h2 className="text-[14.5px] font-extrabold">{team.name}</h2>
        <p className="text-xs text-ink-dim">{team.coach}</p>
      </div>

      <div className="font-mono text-[13px] font-bold tabular-nums">
        {team.remainingCredits}
        <span className="text-ink-dim"> / {team.totalCredits}</span>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {ROLE_ORDER.map((role) => (
          <div
            key={role}
            className={`rounded-lg px-2 py-1 text-center font-mono text-[11px] font-bold tabular-nums ${ROLE_PILL_BG[role]}`}
          >
            {role} {team.roleCounts[role]}/{roleLimits[role]}
          </div>
        ))}
      </div>

      <div className="flex flex-col gap-3">
        {ROLE_ORDER.map((role) => {
          const rolePlayers = team.players.filter((p) => p.role === role);
          if (rolePlayers.length === 0) return null;
          return (
            <div key={role}>
              <h3 className="mb-1 text-[10.5px] font-bold uppercase tracking-[0.04em] text-ink-faint">
                {ROLE_LABELS[role]}
              </h3>
              <ul className="flex flex-col gap-0.5">
                {rolePlayers.map((p) => (
                  <li key={p.id} className="flex items-center justify-between gap-2 py-0.5">
                    <span className="min-w-0 truncate text-[12.5px] font-bold">
                      {p.name}{" "}
                      <span className="font-semibold text-ink-dim">({p.serieATeam})</span>
                    </span>
                    <span className="flex flex-shrink-0 items-center gap-2">
                      <span className="font-mono text-[12px] font-bold tabular-nums">{p.cost}</span>
                      <ReleasePlayerButton playerId={p.id} playerName={p.name} />
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
        {team.players.length === 0 && (
          <p className="text-xs text-ink-dim">Nessun giocatore assegnato.</p>
        )}
      </div>
    </div>
  );
}
