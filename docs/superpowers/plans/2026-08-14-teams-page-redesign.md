# Teams Page Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign `/teams` into a 4-column x 2-row grid of restyled team cards aligned with the app's existing design system, and relocate the "Modifica" (edit team) and "Svincola tutto" (release all) actions into Impostazioni.

**Architecture:** `app/teams/page.tsx` becomes a thin grid shell rendering one `TeamCard` per team (new component). `TeamCard` owns header, credits line, role pills, and per-role player list (with the existing single-player release action). `app/settings/TeamsCard.tsx` gains the "Modifica" and "Svincola tutto" controls per team row, reusing the existing `TeamForm` (`mode="edit"`) and `ReleaseAllButton` components unchanged in behavior, restyled to match the design system already used in Impostazioni.

**Tech Stack:** Next.js App Router (server components + `"use client"` islands), Tailwind CSS with custom design tokens defined in `app/globals.css` (`--indigo`, `--coral`, `--surface`, `--surface-2`, `--ink-dim`, `--ink-faint`, `--border`, etc.), Prisma, `lib/teams.ts` (`getTeamsWithRoster`), `lib/leagueSettings.ts` (`getLeagueSettings`, `getRoleLimit`), `lib/roles.ts` (`ROLE_ORDER`, `ROLE_LABELS`), `lib/roleStyles.ts` (`ROLE_PILL_BG`).

## Global Constraints

- League is fixed at 8 teams — the `/teams` grid is `grid-cols-4` with no wrap/overflow handling for other counts.
- No changes to any API route (`/api/teams/*`, `/api/players/:id`) — all data flow and mutation logic stays as-is.
- Single-player release (`ReleasePlayerButton`, "Svincola" per giocatore) stays in `/teams`, inside `TeamCard`, unchanged.
- Credits line shows `residui / totale` only (e.g. `420 / 500`), matching the homepage format in `app/page.tsx:75-78`. No separate "Spesi" line.
- Design tokens only — no raw Tailwind color utilities (`bg-blue-600`, `border-red-300`, etc.) in any touched file.

---

### Task 1: `TeamCard` component + `/teams` grid page

**Files:**
- Create: `app/teams/TeamCard.tsx`
- Modify: `app/teams/page.tsx`
- Read (no changes): `app/teams/ReleasePlayerButton.tsx`, `lib/teams.ts`, `lib/roles.ts`, `lib/roleStyles.ts`, `lib/leagueSettings.ts`

**Interfaces:**
- Consumes: `getTeamsWithRoster()` from `lib/teams.ts`, returning per team `{ id, name, coach, totalCredits, spentCredits, remainingCredits, roleCounts: Record<Role, number>, players: Array<{ id, name, serieATeam, role, cost }> }`. `getLeagueSettings()` + `getRoleLimit(settings, role)` from `lib/leagueSettings.ts`. `ROLE_ORDER`, `ROLE_LABELS` from `lib/roles.ts`. `ROLE_PILL_BG` from `lib/roleStyles.ts`. `ReleasePlayerButton` from `./ReleasePlayerButton` (props: `{ playerId: string; playerName: string }`, unchanged).
- Produces: `TeamCard` default export, props `{ team: Awaited<ReturnType<typeof getTeamsWithRoster>>[number]; roleLimits: Record<Role, number> }`. Used by `app/teams/page.tsx`.

- [ ] **Step 1: Write `TeamCard.tsx`**

```tsx
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
```

- [ ] **Step 2: Rewrite `app/teams/page.tsx`**

```tsx
import { getTeamsWithRoster } from "@/lib/teams";
import { ROLE_ORDER } from "@/lib/roles";
import { getLeagueSettings, getRoleLimit } from "@/lib/leagueSettings";
import TeamCard from "./TeamCard";

export const dynamic = "force-dynamic";

export default async function TeamsPage() {
  const [teams, leagueSettings] = await Promise.all([
    getTeamsWithRoster(),
    getLeagueSettings(),
  ]);

  const roleLimits = Object.fromEntries(
    ROLE_ORDER.map((r) => [r, getRoleLimit(leagueSettings, r)])
  ) as Record<(typeof ROLE_ORDER)[number], number>;

  return (
    <div className="space-y-7">
      <div>
        <h1 className="text-[22px] font-extrabold">Squadre</h1>
      </div>

      <div className="grid grid-cols-4 gap-4">
        {teams.map((team) => (
          <TeamCard key={team.id} team={team} roleLimits={roleLimits} />
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Remove now-unused imports/usages**

`TeamForm` (edit mode) and `ReleaseAllButton` are no longer imported in `app/teams/page.tsx` — confirm no dangling imports remain (the rewrite in Step 2 already omits them; this step is a final grep check).

Run: `grep -n "TeamForm\|ReleaseAllButton" app/teams/page.tsx`
Expected: no output (both removed).

- [ ] **Step 4: Typecheck / build**

Run: `npm run build`
Expected: build succeeds, no TypeScript errors in `app/teams/TeamCard.tsx` or `app/teams/page.tsx`.

- [ ] **Step 5: Manual browser verification**

Run: `npm run dev`, open `http://localhost:3000/teams`.
Expected:
- 8 team cards laid out 4 per row, 2 rows.
- Each card shows team name, coach, `residui / totale` credits line (no "Spesi" or "Residui:" label text), 4 role pills, players grouped by role.
- "Svincola" next to each player still releases that player (confirm dialog + list updates after refresh).
- No "Modifica" or "Svincola tutto" controls anywhere on the page.

- [ ] **Step 6: Commit**

```bash
git add app/teams/TeamCard.tsx app/teams/page.tsx
git commit -m "feat: redesign teams page as 4x2 card grid"
```

---

### Task 2: Move "Modifica" and "Svincola tutto" into Impostazioni

**Files:**
- Modify: `app/settings/TeamsCard.tsx`
- Modify: `app/teams/TeamForm.tsx` (restyle only)
- Modify: `app/teams/ReleaseAllButton.tsx` (restyle only)
- Modify: `app/teams/DeleteTeamButton.tsx` (restyle only, for row consistency)

**Interfaces:**
- Consumes: `TeamForm` from `@/app/teams/TeamForm` (props unchanged: `{ mode: "create" | "edit"; team?: { id: string; name: string; coach: string; totalCredits: number } }`). `ReleaseAllButton` from `@/app/teams/ReleaseAllButton` (props unchanged: `{ teamId: string; teamName: string; isDisabled: boolean }`). `DeleteTeamButton` from `@/app/teams/DeleteTeamButton` (props unchanged: `{ teamId: string; disabled: boolean }`).
- Produces: no new exports — this task only changes JSX composition inside `TeamsCard` and Tailwind classes inside the three button/form components. No prop or behavior changes.

- [ ] **Step 1: Add "Modifica" and "Svincola tutto" to each team row in `TeamsCard.tsx`**

Replace the row rendering in `app/settings/TeamsCard.tsx` (currently `app/settings/TeamsCard.tsx:22-28`):

```tsx
import { Users, Trash2 } from "lucide-react";
import { getTeamsWithRoster } from "@/lib/teams";
import TeamForm from "@/app/teams/TeamForm";
import ReleaseAllButton from "@/app/teams/ReleaseAllButton";
import DeleteTeamButton from "@/app/teams/DeleteTeamButton";

export default async function TeamsCard() {
  const teams = await getTeamsWithRoster();

  return (
    <div className="flex flex-col gap-3.5 rounded-2xl border border-border bg-surface p-5 shadow-sm">
      <div className="flex items-center gap-2.5">
        <div className="flex h-9 w-9 items-center justify-center rounded-[10px] bg-mint text-teal">
          <Users size={18} strokeWidth={1.8} />
        </div>
        <div>
          <h3 className="text-[14.5px] font-extrabold">Squadre</h3>
          <p className="text-xs text-ink-dim">Crea, modifica ed elimina squadre di lega</p>
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        {teams.map((t) => (
          <div key={t.id} className="flex items-center gap-2.5 rounded-lg bg-surface-2 px-2.5 py-2 flex-wrap">
            <span className="flex-1 text-[12.5px] font-bold">{t.name}</span>
            <span className="font-mono text-[11px] tabular-nums text-ink-dim">{t.totalCredits} cr</span>
            <TeamForm mode="edit" team={t} />
            <ReleaseAllButton
              teamId={t.id}
              teamName={t.name}
              isDisabled={t.players.length === 0}
            />
            <DeleteTeamButton teamId={t.id} disabled={t.players.length > 0} />
          </div>
        ))}
        {teams.length === 0 && <p className="text-xs text-ink-dim">Nessuna squadra creata.</p>}
      </div>

      <TeamForm mode="create" />
    </div>
  );
}
```

- [ ] **Step 2: Restyle `TeamForm.tsx` to design tokens**

In `app/teams/TeamForm.tsx`, replace the closed-state button and the open-state form classes:

```tsx
  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="rounded-lg bg-indigo px-3 py-1.5 text-[12px] font-bold text-white"
      >
        {mode === "create" ? "Nuova squadra" : "Modifica"}
      </button>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-wrap items-center gap-2">
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Nome squadra"
        required
        className="rounded-lg border border-border px-2 py-1 text-[12.5px]"
      />
      <input
        value={coach}
        onChange={(e) => setCoach(e.target.value)}
        placeholder="Allenatore"
        required
        className="rounded-lg border border-border px-2 py-1 text-[12.5px]"
      />
      <input
        type="number"
        value={totalCredits}
        onChange={(e) => setTotalCredits(Number(e.target.value))}
        min={0}
        required
        className="w-24 rounded-lg border border-border px-2 py-1 text-[12.5px]"
      />
      <button type="submit" className="rounded-lg bg-teal px-3 py-1 text-[12px] font-bold text-white">
        Salva
      </button>
      <button type="button" onClick={() => setOpen(false)} className="text-[12px] font-semibold text-ink-dim">
        Annulla
      </button>
      {error && <span className="text-[12px] font-semibold text-coral">{error}</span>}
    </form>
  );
```

(Only the JSX/className content changes — `handleSubmit`, state hooks, and all logic above stay exactly as-is.)

- [ ] **Step 3: Restyle `ReleaseAllButton.tsx` to design tokens**

In `app/teams/ReleaseAllButton.tsx`, replace the returned `<button>`:

```tsx
  return (
    <button
      type="button"
      onClick={handleReleaseAll}
      disabled={isDisabled}
      className="rounded-lg border border-coral px-3 py-1.5 text-[12px] font-bold text-coral disabled:opacity-40 disabled:cursor-not-allowed"
    >
      Svincola tutto
    </button>
  );
```

(Only the JSX/className content changes — `handleReleaseAll` and the `useRouter` logic stay exactly as-is.)

- [ ] **Step 4: Restyle `DeleteTeamButton.tsx` to design tokens**

In `app/teams/DeleteTeamButton.tsx`, replace the returned `<button>`:

```tsx
  return (
    <button
      onClick={handleDelete}
      disabled={disabled}
      title={disabled ? "Svincola prima tutti i giocatori" : undefined}
      className="rounded-lg border border-border px-3 py-1.5 text-[12px] font-bold text-ink-dim disabled:opacity-40 disabled:cursor-not-allowed"
    >
      Elimina
    </button>
  );
```

(Only the JSX/className content changes — `handleDelete` and the `useRouter` logic stay exactly as-is.)

- [ ] **Step 5: Typecheck / build**

Run: `npm run build`
Expected: build succeeds, no TypeScript errors.

- [ ] **Step 6: Manual browser verification**

Run: `npm run dev`, open `http://localhost:3000/settings`.
Expected:
- "Squadre" card lists each team with name, credits, "Modifica", "Svincola tutto", "Elimina" — all styled with the app's indigo/teal/coral/border tokens (no leftover `bg-blue-600` / `border-orange-300` / `border-red-300` look).
- "Modifica" opens the inline rename/allenatore/crediti form and saves correctly (`PATCH /api/teams/:id`).
- "Svincola tutto" prompts confirm, then releases every player of that team (disabled when roster is empty).
- "Elimina" still disabled when team has players, works when empty.
- Open `/teams`: confirm no "Modifica" or "Svincola tutto" appear there (already covered by Task 1, re-check after this task's changes).

- [ ] **Step 7: Commit**

```bash
git add app/settings/TeamsCard.tsx app/teams/TeamForm.tsx app/teams/ReleaseAllButton.tsx app/teams/DeleteTeamButton.tsx
git commit -m "feat: move team edit and release-all actions into settings"
```
