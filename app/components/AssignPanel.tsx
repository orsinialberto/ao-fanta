"use client";

import { useRef, useState } from "react";
import RoleBadge from "@/app/components/RoleBadge";
import InlineError from "@/app/components/InlineError";
import { errorMessage } from "@/lib/http";
import { ROLE_LABELS, isValidRole, type Role } from "@/lib/roles";
import { TIER_LABELS, isValidTier } from "@/lib/wishlist";
import {
  STAT_KEYS,
  STAT_LABELS,
  STAT_DECIMALS,
  statFraction,
  EMPTY_ROLE_STATS,
  type RoleStats,
  type StatKey,
} from "@/lib/roleStats";
import type { PlayerWithTeam, TeamSummary } from "@/lib/types";

/** Digit shortcuts only reach the first nine teams; the rest need a click. */
const MAX_DIGIT_SHORTCUTS = 9;

export default function AssignPanel({
  player,
  teams,
  roleLimits,
  roleStats,
  onAssigned,
  onClose,
}: {
  player: PlayerWithTeam;
  teams: TeamSummary[];
  roleLimits: Record<Role, number>;
  roleStats: Record<Role, RoleStats>;
  onAssigned: () => void;
  onClose: () => void;
}) {
  const role = isValidRole(player.role) ? player.role : null;
  const isFull = (team: TeamSummary) => (role ? team.roleCounts[role] >= roleLimits[role] : false);
  const availableTeams = teams.filter((t) => !isFull(t));

  const [teamId, setTeamId] = useState(availableTeams[0]?.id ?? "");
  const [cost, setCost] = useState("0");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const costRef = useRef<HTMLInputElement>(null);

  const stats = role ? roleStats[role] : EMPTY_ROLE_STATS;
  const rawTier = player.wishlistTier ?? "";
  const tier = isValidTier(rawTier) ? rawTier : null;

  const selectedTeam = teams.find((t) => t.id === teamId);
  const costValue = Number(cost) || 0;
  const remainingAfter = selectedTeam ? selectedTeam.remainingCredits - costValue : null;
  const overBudget = remainingAfter !== null && remainingAfter < 0;
  const noTeamsAvailable = availableTeams.length === 0;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (noTeamsAvailable || submitting) return;
    setError(null);
    setSubmitting(true);

    const res = await fetch(`/api/players/${player.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fantasyTeamId: teamId, cost: costValue }),
    });

    if (!res.ok) {
      setError(await errorMessage(res));
      setSubmitting(false);
      return;
    }

    onAssigned();
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLDivElement>) {
    if (e.key === "Escape") {
      e.preventDefault();
      onClose();
      return;
    }

    // Digits belong to the cost field whenever it has the caret; everywhere
    // else in the panel they pick a team.
    if (e.target === costRef.current) return;
    if (!/^[1-9]$/.test(e.key)) return;
    const team = teams[Number(e.key) - 1];
    if (!team || isFull(team)) return;
    e.preventDefault();
    setTeamId(team.id);
    costRef.current?.focus();
    costRef.current?.select();
  }

  return (
    <div
      onKeyDown={handleKeyDown}
      className="motion-safe:animate-[assign-panel-in_180ms_var(--ease-standard)]"
    >
      <div className="flex items-center gap-3 border-t border-line bg-surface-sunk px-4 py-1.5">
        <span className="text-label uppercase text-ink-3">Assegnazione</span>
        <button
          type="button"
          onClick={onClose}
          className="ml-auto text-small-dense text-ink-3 transition-colors duration-fast ease-standard hover:text-ink"
        >
          Esc torna ai risultati
        </button>
      </div>

      <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_296px]">
        {/* ── chi è: identità e statistiche contro il ruolo ── */}
        <div className="border-b border-line p-4 lg:border-b-0 lg:border-r">
          <div className="mb-4 flex items-center gap-3">
            <RoleBadge role={player.role} size="lg" />
            <div className="min-w-0">
              <div className="text-h3 font-bold">{player.name}</div>
              <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-small-dense text-ink-3">
                <span>{player.serieATeam}</span>
                <span aria-hidden>·</span>
                <span>{role ? ROLE_LABELS[role] : player.role}</span>
                {player.appearances !== null && (
                  <>
                    <span aria-hidden>·</span>
                    <span>
                      <span className="font-mono font-medium tabular-nums">{player.appearances}</span>{" "}
                      presenze
                    </span>
                  </>
                )}
                {tier && (
                  <span
                    title={`Lista ${tier} — ${TIER_LABELS[tier]}`}
                    className="flex h-[18px] w-[18px] items-center justify-center rounded-sm border border-accent bg-accent-bg font-mono text-small-dense font-semibold text-accent"
                  >
                    {tier}
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-2.5">
            {STAT_KEYS.map((key) => (
              <StatRow
                key={key}
                statKey={key}
                value={player[key]}
                scale={stats[key]}
                role={role}
              />
            ))}
          </div>
        </div>

        {/* ── dove va: squadra, costo, conferma ── */}
        <div className="flex flex-col gap-3.5 p-4">
          <div>
            <div className="mb-1.5 flex items-baseline justify-between">
              <span className="text-label uppercase text-ink-3">Squadra</span>
              <span className="text-small-dense text-ink-3">residui</span>
            </div>
            <div
              role="radiogroup"
              aria-label="Squadra a cui assegnare il giocatore"
              className="flex flex-col gap-1.5"
            >
              {teams.map((team, i) => {
                const full = isFull(team);
                const selected = team.id === teamId;
                return (
                  <button
                    key={team.id}
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    disabled={full}
                    onClick={() => setTeamId(team.id)}
                    className={`flex items-baseline gap-2 rounded-sm border px-2.5 py-1.5 text-left transition-colors duration-fast ease-standard disabled:cursor-not-allowed disabled:opacity-40 ${
                      selected
                        ? "border-accent bg-accent-bg text-accent"
                        : "border-line-strong bg-surface hover:border-ink-3"
                    }`}
                  >
                    {i < MAX_DIGIT_SHORTCUTS && (
                      <span
                        aria-hidden
                        className={`rounded-[3px] border px-1 font-mono text-[10px] font-semibold leading-snug ${
                          selected ? "border-accent text-accent" : "border-line text-ink-3"
                        }`}
                      >
                        {i + 1}
                      </span>
                    )}
                    <span className="truncate text-body-dense font-semibold">{team.name}</span>
                    <span
                      className={`ml-auto shrink-0 font-mono text-small-dense font-semibold tabular-nums ${
                        selected ? "text-accent" : "text-ink-2"
                      }`}
                    >
                      {full && role ? `${role} pieno` : team.remainingCredits}
                    </span>
                  </button>
                );
              })}
              {teams.length === 0 && (
                <p className="text-small-dense text-ink-3">
                  Nessuna squadra — creane una in Impostazioni.
                </p>
              )}
            </div>
          </div>

          <label
            className={`flex items-baseline gap-2 rounded-sm border px-3 py-1.5 transition-colors duration-fast ease-standard focus-within:ring-4 ${
              overBudget
                ? "border-danger focus-within:ring-danger-bg"
                : "border-line-strong focus-within:border-accent focus-within:ring-accent-bg"
            }`}
          >
            <span className="text-label uppercase text-ink-3">Costo</span>
            <input
              ref={costRef}
              autoFocus
              type="number"
              inputMode="numeric"
              min={0}
              required
              value={cost}
              onChange={(e) => setCost(e.target.value)}
              onFocus={(e) => e.target.select()}
              aria-label="Costo in crediti"
              className={`ml-auto w-24 bg-transparent text-right font-mono text-[24px]/tight font-bold tabular-nums tracking-tight focus:outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none ${
                overBudget ? "text-danger" : ""
              }`}
            />
          </label>

          <div className="flex items-center gap-3">
            {remainingAfter !== null && (
              <span className={`text-small-dense ${overBudget ? "text-danger" : "text-ink-3"}`}>
                Dopo:{" "}
                <span
                  className={`font-mono font-semibold tabular-nums ${
                    overBudget ? "text-danger" : "text-ink-2"
                  }`}
                >
                  {remainingAfter}
                </span>{" "}
                residui
              </span>
            )}
            <button
              type="submit"
              disabled={noTeamsAvailable || submitting}
              className="ml-auto rounded-sm bg-accent px-3.5 py-2 text-small font-semibold text-white transition-colors duration-fast ease-standard hover:bg-accent-hover disabled:opacity-40"
            >
              Conferma <span className="ml-1.5 font-mono text-[10.5px] opacity-70">↵</span>
            </button>
          </div>

          {overBudget && selectedTeam && (
            <InlineError
              title={`${selectedTeam.name} ha ${selectedTeam.remainingCredits} crediti`}
              message="Puoi confermare lo stesso: la squadra andrà in negativo."
            />
          )}
          {noTeamsAvailable && role && teams.length > 0 && (
            <InlineError
              title={`Nessuna squadra ha posti liberi per ${ROLE_LABELS[role]}`}
              message={`Svincola un giocatore in questo ruolo da una squadra per poter assegnare ${player.name}.`}
            />
          )}
          {error && <InlineError message={error} />}
        </div>
      </form>
    </div>
  );
}

/**
 * One stat as a number plus a bar, with a notch marking the average of the
 * players still on the market *in the same role*. A bar past the notch means
 * "above what is left in this role" — readable without parsing either number.
 */
function StatRow({
  statKey,
  value,
  scale,
  role,
}: {
  statKey: StatKey;
  value: number | null;
  scale: RoleStats[StatKey];
  role: Role | null;
}) {
  const hero = statKey === "fantaMedia";
  const decimals = STAT_DECIMALS[statKey];
  const fill = statFraction(value, scale);
  const notch = scale ? statFraction(scale.avg, scale) : 0;

  return (
    <div>
      <div className="mb-1 flex items-baseline gap-2">
        <span className="w-[88px] shrink-0 text-label uppercase text-ink-3">
          {STAT_LABELS[statKey]}
        </span>
        {value === null ? (
          <span className="font-mono text-body-dense font-medium tabular-nums text-ink-3">—</span>
        ) : (
          <span
            className={`font-mono font-bold tabular-nums tracking-tight ${
              hero ? "text-[19px]/tight text-accent" : "text-[17px]/tight"
            }`}
          >
            {value.toFixed(decimals.value)}
          </span>
        )}
        {scale && (
          <span
            className="ml-auto text-small-dense text-ink-3"
            title={`Media dei ${scale.count} ${
              role ? ROLE_LABELS[role].toLowerCase() : "giocatori"
            } ancora svincolati che hanno giocato più della metà delle partite`}
          >
            media {role ? ROLE_LABELS[role].toLowerCase() : "ruolo"}{" "}
            <span className="font-mono font-semibold tabular-nums">
              {scale.avg.toFixed(decimals.average)}
            </span>
          </span>
        )}
      </div>

      <div className="relative h-1 overflow-hidden rounded-full bg-line">
        <div
          className={`absolute inset-y-0 left-0 rounded-full transition-[width] duration-base ease-standard ${
            hero ? "bg-accent" : "bg-ink-2"
          }`}
          style={{ width: `${fill * 100}%` }}
        />
        {scale && (
          <span
            aria-hidden
            className="absolute inset-y-0 w-px bg-ink-3"
            style={{ left: `${notch * 100}%` }}
          />
        )}
      </div>
    </div>
  );
}
