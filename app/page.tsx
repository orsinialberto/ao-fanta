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
      </div>

      <AstaSearch teams={teamSummaries} roleLimits={roleLimits} />

      <div className="rounded-2xl border border-border bg-surface p-[18px] shadow-sm">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-[13.5px] font-extrabold">Crediti squadre</h3>
          <span className="text-[11px] font-semibold text-ink-faint">{teams.length} squadre</span>
        </div>

        {teams.length === 0 && (
          <p className="text-xs text-ink-dim">Nessuna squadra ancora — creane una in Impostazioni.</p>
        )}

        {teams.length > 0 && (
          <>
            <div className="flex items-center justify-between gap-3.5 px-1 text-[10.5px] font-bold uppercase tracking-[0.04em] text-ink-faint">
              <div className="flex-1">Squadra</div>
              <div className="flex-1 text-center">Rosa</div>
              <div className="flex-1 text-right">Crediti</div>
            </div>
            {teams.map((t) => (
              <div
                key={t.id}
                className="flex items-center justify-between gap-3.5 rounded-lg px-1 py-2 hover:bg-surface-2"
              >
                <div className="flex-1 text-sm font-extrabold">{t.name}</div>
                <div className="flex flex-1 justify-center gap-1.5">
                  {ROLE_ORDER.map((role) => (
                    <div
                      key={role}
                      className={`rounded-lg px-2 py-1 text-center font-mono text-[11px] font-bold tabular-nums ${ROLE_PILL_BG[role]}`}
                    >
                      {role} {t.roleCounts[role]}/{roleLimits[role]}
                    </div>
                  ))}
                </div>
                <div className="flex-1 text-right font-mono text-[13px] font-bold tabular-nums">
                  {t.remainingCredits}
                  <span className="text-ink-dim"> / {t.totalCredits}</span>
                </div>
              </div>
            ))}
          </>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3.5">
        <WishlistPanel players={wishlist} />

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
