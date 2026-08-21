"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { Search, X } from "lucide-react";
import { ROLE_ORDER, type Role } from "@/lib/roles";
import { ROLE_CHIP_ON } from "@/lib/roleStyles";
import { TIER_ORDER, TIER_LABELS } from "@/lib/wishlist";
import type { AttendanceFilter } from "@/lib/players";
import {
  readFilterState,
  writeFilterState,
  toggleRole,
  toggleTier,
  activeFilterCount,
} from "@/lib/filterParams";

const DEBOUNCE_MS = 250;

const BOOLEAN_LABELS = {
  freeAgentOnly: "Svincolati",
  starterOnly: "Titolari",
} as const;

type BooleanKey = keyof typeof BOOLEAN_LABELS;

const PRESENZE_OPTIONS: { value: AttendanceFilter | ""; label: string }[] = [
  { value: "", label: "Tutte le presenze" },
  { value: "25", label: "Presenze >25%" },
  { value: "50", label: "Presenze >50%" },
  { value: "75", label: "Presenze >75%" },
];

export default function ListoneToolbar({
  serieATeams,
  resultCount,
  showStatusToggles = true,
}: {
  serieATeams: string[];
  resultCount: number;
  showStatusToggles?: boolean;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const state = readFilterState(new URLSearchParams(searchParams.toString()));
  const [search, setSearch] = useState(state.search);

  // Keep the input in step with back/forward navigation.
  useEffect(() => {
    setSearch(readFilterState(new URLSearchParams(searchParams.toString())).search);
  }, [searchParams]);

  useEffect(() => {
    const timer = setTimeout(() => {
      const current = readFilterState(new URLSearchParams(window.location.search));
      if (current.search === search) return;
      push({ ...current, search });
    }, DEBOUNCE_MS);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  function push(next: Parameters<typeof writeFilterState>[0]) {
    const qs = writeFilterState(next);
    router.replace(qs ? `${pathname}?${qs}` : pathname);
  }

  const activeCount = activeFilterCount(state);

  return (
    <div className="border-b border-line pb-3">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-3">
        <div className="flex w-full items-center gap-2 rounded-md border border-line bg-surface-sunk px-3 py-1.5 transition-colors duration-fast ease-standard focus-within:border-accent sm:w-56">
          <Search size={14} className="shrink-0 text-ink-3" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cerca per nome…"
            className="w-full bg-transparent text-small placeholder:text-ink-3 focus:outline-none"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch("")}
              aria-label="Svuota ricerca"
              className="shrink-0 text-ink-3 transition-colors duration-fast ease-standard hover:text-ink"
            >
              <X size={13} />
            </button>
          )}
        </div>

        <div className="flex gap-1">
          {ROLE_ORDER.map((role) => (
            <button
              key={role}
              type="button"
              aria-pressed={state.role.includes(role)}
              onClick={() => push({ ...state, role: toggleRole(state.role, role) })}
              className={`h-7 w-7 rounded-sm border font-mono text-small-dense font-semibold transition-colors duration-fast ease-standard ${
                state.role.includes(role)
                  ? ROLE_CHIP_ON[role]
                  : "border-line-strong bg-surface text-ink-3 hover:border-ink-3 hover:text-ink-2"
              }`}
            >
              {role}
            </button>
          ))}
        </div>

        {showStatusToggles && (
          <div className="flex items-center gap-1.5">
            {/* Labelled because "C" means centrocampista two chip groups to the
                left, and an unlabelled A/B/C row next to P/D/C/A reads wrong. */}
            <span className="text-label uppercase text-ink-3">Wish</span>
            <div className="flex gap-1">
              {TIER_ORDER.map((tier) => {
                const active = state.wishlistTier.includes(tier);
                return (
                  <button
                    key={tier}
                    type="button"
                    aria-pressed={active}
                    title={`Lista ${tier} — ${TIER_LABELS[tier]}`}
                    onClick={() =>
                      push({ ...state, wishlistTier: toggleTier(state.wishlistTier, tier) })
                    }
                    className={`h-7 w-7 rounded-sm border font-mono text-small-dense font-semibold transition-colors duration-fast ease-standard ${
                      active
                        ? "border-accent bg-accent-bg text-accent"
                        : "border-line-strong bg-surface text-ink-3 hover:border-ink-3 hover:text-ink-2"
                    }`}
                  >
                    {tier}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        <select
          value={state.serieATeam}
          onChange={(e) => push({ ...state, serieATeam: e.target.value })}
          className="rounded-md border border-line-strong bg-surface px-3 py-1.5 text-small text-ink-2 transition-colors duration-fast ease-standard hover:border-ink-3"
        >
          <option value="">Tutte le squadre</option>
          {serieATeams.map((team) => (
            <option key={team} value={team}>
              {team}
            </option>
          ))}
        </select>

        <select
          value={state.presenze}
          onChange={(e) => push({ ...state, presenze: e.target.value as AttendanceFilter | "" })}
          className="rounded-md border border-line-strong bg-surface px-3 py-1.5 text-small text-ink-2 transition-colors duration-fast ease-standard hover:border-ink-3"
        >
          {PRESENZE_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>

        {showStatusToggles && (
          <div className="flex gap-4">
            {(Object.keys(BOOLEAN_LABELS) as BooleanKey[]).map((key) => (
              <label
                key={key}
                className={`flex cursor-pointer items-center gap-2 text-small transition-colors duration-fast ease-standard ${
                  state[key] ? "text-ink" : "text-ink-2"
                }`}
              >
                <input
                  type="checkbox"
                  checked={state[key]}
                  onChange={() => push({ ...state, [key]: !state[key] })}
                  className="h-3.5 w-3.5 accent-accent"
                />
                {BOOLEAN_LABELS[key]}
              </label>
            ))}
          </div>
        )}

        <span className="ml-auto font-mono text-small-dense font-medium tabular-nums text-ink-3">
          {resultCount} risultati
        </span>
      </div>

      {activeCount > 0 && (
        <div className="mt-3 flex flex-wrap items-center gap-1.5">
          {state.role.map((r) => (
            <Chip key={r} label={r} onRemove={() => push({ ...state, role: toggleRole(state.role, r) })} />
          ))}
          {state.wishlistTier.map((tier) => (
            <Chip
              key={`tier-${tier}`}
              label={`Wish ${tier}`}
              onRemove={() =>
                push({ ...state, wishlistTier: toggleTier(state.wishlistTier, tier) })
              }
            />
          ))}
          {state.serieATeam && (
            <Chip
              label={state.serieATeam}
              onRemove={() => push({ ...state, serieATeam: "" })}
            />
          )}
          {state.presenze && (
            <Chip
              label={PRESENZE_OPTIONS.find((o) => o.value === state.presenze)!.label}
              onRemove={() => push({ ...state, presenze: "" })}
            />
          )}
          {(Object.keys(BOOLEAN_LABELS) as BooleanKey[])
            .filter((key) => state[key])
            .map((key) => (
              <Chip
                key={key}
                label={BOOLEAN_LABELS[key]}
                onRemove={() => push({ ...state, [key]: false })}
              />
            ))}
          <button
            type="button"
            onClick={() =>
              push({
                ...state,
                role: [],
                wishlistTier: [],
                serieATeam: "",
                presenze: "",
                freeAgentOnly: false,
                starterOnly: false,
              })
            }
            className="ml-2 text-small-dense font-semibold text-ink-3 transition-colors duration-fast ease-standard hover:text-danger"
          >
            Azzera tutto
          </button>
        </div>
      )}
    </div>
  );
}

function Chip({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-accent-bg px-2 py-1 text-small-dense font-semibold text-accent">
      {label}
      <button
        type="button"
        onClick={onRemove}
        aria-label={`Rimuovi filtro ${label}`}
        className="transition-opacity duration-fast ease-standard hover:opacity-60"
      >
        <X size={11} />
      </button>
    </span>
  );
}
