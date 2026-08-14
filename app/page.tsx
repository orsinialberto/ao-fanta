import { getFilteredPlayers, getRecentAcquisitions } from "@/lib/players";
import { getTeamsWithRoster } from "@/lib/teams";
import { getLeagueSettings, getRoleLimit } from "@/lib/leagueSettings";
import { ROLE_ORDER } from "@/lib/roles";
import { ROLE_PILL_BG } from "@/lib/roleStyles";
import { groupByDay } from "@/lib/dates";
import AstaSearch from "@/app/components/AstaSearch";
import WishlistPanel from "@/app/components/WishlistPanel";
import RoleBadge from "@/app/components/RoleBadge";

export const dynamic = "force-dynamic";

export default async function AstaPage() {
  const [teams, leagueSettings, wishlist, recent] = await Promise.all([
    getTeamsWithRoster(),
    getLeagueSettings(),
    getFilteredPlayers({ watchlistOnly: true, freeAgentOnly: true }),
    getRecentAcquisitions(5),
  ]);

  const roleLimits = Object.fromEntries(
    ROLE_ORDER.map((r) => [r, getRoleLimit(leagueSettings, r)])
  ) as Record<(typeof ROLE_ORDER)[number], number>;

  const recentByDay = groupByDay(recent, (p) => p.assignedAt);

  const teamSummaries = teams.map((t) => ({
    id: t.id,
    name: t.name,
    remainingCredits: t.remainingCredits,
    roleCounts: t.roleCounts,
  }));

  return (
    <div className="space-y-7">
      <div>
        <h1 className="text-[22px] font-extrabold">Asta</h1>
        <p className="text-sm text-ink-dim">Cerca un giocatore chiamato e assegnalo in due click.</p>
      </div>

      <AstaSearch teams={teamSummaries} roleLimits={roleLimits} />

      <div>
        <div className="mb-3 text-[11px] font-bold uppercase tracking-wide text-ink-faint">
          Crediti squadre
        </div>
        <div className="grid grid-cols-3 gap-3.5">
          {teams.map((t) => {
            const spentPct =
              t.totalCredits > 0
                ? Math.round(((t.totalCredits - t.remainingCredits) / t.totalCredits) * 100)
                : 0;
            return (
              <div key={t.id} className="rounded-2xl border border-border bg-surface p-[18px] shadow-sm">
                <div className="mb-3.5 flex items-start justify-between">
                  <div>
                    <div className="text-sm font-extrabold">{t.name}</div>
                    <div className="text-[11.5px] text-ink-dim">{t.players.length} giocatori</div>
                  </div>
                  <div className="text-right font-mono text-[22px] font-bold tabular-nums">
                    {t.remainingCredits}
                    <span className="block font-sans text-[11px] font-semibold text-ink-dim">
                      / {t.totalCredits} cr
                    </span>
                  </div>
                </div>
                <div className="mb-3.5 h-[5px] overflow-hidden rounded-full bg-surface-2">
                  <div className="h-full rounded-full bg-indigo" style={{ width: `${spentPct}%` }} />
                </div>
                <div className="grid grid-cols-4 gap-1.5">
                  {ROLE_ORDER.map((role) => {
                    const full = t.roleCounts[role] >= roleLimits[role];
                    return (
                      <div
                        key={role}
                        className={`rounded-lg py-1.5 text-center font-mono text-[11px] font-bold tabular-nums ${
                          ROLE_PILL_BG[role]
                        } ${full ? "outline outline-[1.5px] -outline-offset-1" : ""}`}
                      >
                        {role} {t.roleCounts[role]}/{roleLimits[role]}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
          {teams.length === 0 && (
            <p className="col-span-3 text-sm text-ink-dim">
              Nessuna squadra ancora — creane una in Impostazioni.
            </p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3.5">
        <WishlistPanel players={wishlist} teams={teamSummaries} roleLimits={roleLimits} />

        <div className="rounded-2xl border border-border bg-surface p-[18px] shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-[13.5px] font-extrabold">Ultimi acquisti</h3>
            <span className="text-[11px] font-semibold text-ink-faint">{recent.length} recenti</span>
          </div>

          {recent.length === 0 && <p className="text-xs text-ink-dim">Nessun acquisto ancora.</p>}

          {recentByDay.map((group, groupIndex) => (
            <div key={group.label}>
              <div
                className={`mb-1.5 text-[10.5px] font-bold uppercase tracking-[0.04em] text-ink-faint ${
                  groupIndex === 0 ? "" : "mt-3.5"
                }`}
              >
                {group.label}
              </div>
              {group.items.map((p) => (
                <div key={p.id} className="flex items-center gap-2.5 rounded-lg px-1 py-2">
                  <RoleBadge role={p.role} size="sm" />
                  <div className="min-w-0 flex-1 truncate text-[13px] font-bold">
                    {p.name} <span className="font-semibold text-ink-dim">— {p.fantasyTeam?.name}</span>
                  </div>
                  <div className="flex-shrink-0 font-mono text-[12.5px] font-bold tabular-nums text-coral">
                    {p.cost} cr
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
