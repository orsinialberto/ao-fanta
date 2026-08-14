import { getFilteredPlayers, getRecentAcquisitions } from "@/lib/players";
import { getTeamsWithRoster } from "@/lib/teams";
import { getLeagueSettings, getRoleLimit } from "@/lib/leagueSettings";
import { ROLE_ORDER } from "@/lib/roles";
import AstaSearch from "@/app/components/AstaSearch";

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
        <div className="mb-3 text-[11px] font-bold uppercase tracking-wide text-ink-dim/70">
          Crediti squadre
        </div>
        <div className="grid grid-cols-3 gap-3.5">
          {teams.map((t) => (
            <div key={t.id} className="rounded-2xl border border-border bg-surface p-4.5 shadow-sm">
              <div className="mb-3.5 flex items-start justify-between">
                <div>
                  <div className="text-sm font-extrabold">{t.name}</div>
                  <div className="text-[11.5px] text-ink-dim">{t.players.length} giocatori</div>
                </div>
                <div className="text-right font-mono text-[22px] font-bold">
                  {t.remainingCredits}
                  <span className="block font-sans text-[11px] font-semibold text-ink-dim">
                    / {t.totalCredits} cr
                  </span>
                </div>
              </div>
              <div className="mb-3.5 grid grid-cols-4 gap-1.5">
                {ROLE_ORDER.map((role) => (
                  <div
                    key={role}
                    className={`rounded-lg py-1.5 text-center font-mono text-[11px] font-bold ${
                      { P: "bg-teal-soft text-teal", D: "bg-indigo-soft text-indigo", C: "bg-amber-soft text-amber", A: "bg-coral-soft text-coral" }[role]
                    }`}
                  >
                    {role} {t.roleCounts[role]}/{roleLimits[role]}
                  </div>
                ))}
              </div>
            </div>
          ))}
          {teams.length === 0 && (
            <p className="col-span-3 text-sm text-ink-dim">
              Nessuna squadra ancora — creane una in Impostazioni.
            </p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3.5">
        <div className="rounded-2xl border border-border bg-surface p-4.5 shadow-sm">
          <h3 className="mb-3 text-[13.5px] font-extrabold">Wishlist</h3>
          {wishlist.length === 0 && <p className="text-xs text-ink-dim">Nessun giocatore in wishlist.</p>}
          {wishlist.map((p) => (
            <div key={p.id} className="flex items-center gap-2.5 py-2">
              <span className="flex-1 text-[13px] font-bold">
                {p.name} <span className="font-normal text-ink-dim">({p.serieATeam})</span>
              </span>
            </div>
          ))}
        </div>
        <div className="rounded-2xl border border-border bg-surface p-4.5 shadow-sm">
          <h3 className="mb-3 text-[13.5px] font-extrabold">Ultimi acquisti</h3>
          {recent.length === 0 && <p className="text-xs text-ink-dim">Nessun acquisto ancora.</p>}
          {recent.map((p) => (
            <div key={p.id} className="flex items-center gap-2.5 py-2">
              <span className="flex-1 text-[13px] font-bold">
                {p.name} <span className="font-normal text-ink-dim">— {p.fantasyTeam?.name}</span>
              </span>
              <span className="font-mono text-[12.5px] font-bold text-coral">{p.cost} cr</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
