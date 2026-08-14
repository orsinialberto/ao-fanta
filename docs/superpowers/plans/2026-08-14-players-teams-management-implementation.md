# Gestione Giocatori e Squadre: Svincoli, Ruolo, Filtri, Ordinamento Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add release player/team, role change, dynamic Serie A filter, column sorting, and database wipe capabilities to the fantasy football app.

**Architecture:** Backend endpoints for destructive operations (wipe, release-all), lightweight client components for UI buttons following existing patterns (DeleteTeamButton), inline selects in PlayersTable for role changes and column sorting via client-side useMemo (no server round-trips for sorting).

**Tech Stack:** Next.js 15, React 19, Prisma 5, SQLite, TypeScript, Tailwind CSS

## Global Constraints

- Role limits enforced at database level: P (3), D (8), C (8), A (6)
- Valid roles: "P", "D", "C", "A" (validated with `isValidRole()`)
- Client components use `useRouter()` for `router.refresh()` navigation updates
- Error messaging via `errorMessage()` utility from `@/lib/http`
- Destructive operations require explicit user confirmation
- Sorting is client-side only; state does not persist across page reloads

---

## Task 1: Add DELETE endpoint to wipe all players

**Files:**
- Modify: `app/api/players/route.ts`

**Interfaces:**
- Consumes: None (new endpoint)
- Produces: `DELETE /api/players` → `{ ok: true }` on success

- [ ] **Step 1: Add DELETE handler to `/api/players/route.ts`**

At the end of the file, after the existing `GET` and `POST` handlers:

```typescript
export async function DELETE(req: NextRequest) {
  await prisma.player.deleteMany({});
  return NextResponse.json({ ok: true });
}
```

- [ ] **Step 2: Test the endpoint locally**

Start dev server: `npm run dev`

In browser DevTools console or via curl, test:
```bash
curl -X DELETE http://localhost:3000/api/players
```

Expected: `{ ok: true }`

- [ ] **Step 3: Verify database is empty**

Inspect SQLite:
```bash
sqlite3 prisma/dev.db "SELECT COUNT(*) FROM Player;"
```

Expected: 0 (after first DELETE, 600-ish before)

- [ ] **Step 4: Commit**

```bash
git add app/api/players/route.ts
git commit -m "feat: add DELETE endpoint to wipe all players"
```

---

## Task 2: Extend role-limit check in PATCH `/api/players/[id]`

**Files:**
- Modify: `app/api/players/[id]/route.ts:1-73`

**Interfaces:**
- Consumes: Existing `PATCH` handler signature unchanged
- Produces: Same PATCH endpoint, now validates role limits when `role` changes on assigned players

- [ ] **Step 1: Add helper function above PATCH handler**

Near the top of the file, after imports, add:

```typescript
async function checkRoleLimit(
  playerTeamId: string | null,
  newRole: string,
  playerId: string
): Promise<{ ok: boolean; error?: string }> {
  if (!playerTeamId || !isValidRole(newRole)) return { ok: true };

  const count = await prisma.player.count({
    where: {
      fantasyTeamId: playerTeamId,
      role: newRole,
      id: { not: playerId },
    },
  });

  const limit = ROLE_LIMITS[newRole as Role];
  if (count >= limit) {
    return {
      ok: false,
      error: `Limite raggiunto per ruolo ${ROLE_LABELS[newRole]} (${limit}/${limit})`,
    };
  }
  return { ok: true };
}
```

- [ ] **Step 2: Find the role-change branch in PATCH handler**

Locate this code block (around line 13-19):
```typescript
if (body.role !== undefined) {
  if (!isValidRole(body.role)) {
    return NextResponse.json({ error: "Invalid role" }, { status: 400 });
  }
  data.role = body.role;
}
```

- [ ] **Step 3: Extend the role-change branch to check limits**

Replace the block above with:

```typescript
if (body.role !== undefined) {
  if (!isValidRole(body.role)) {
    return NextResponse.json({ error: "Invalid role" }, { status: 400 });
  }
  
  // If this is a pure role change (no fantasyTeamId change) on an assigned player,
  // check if the new role would exceed the team's limits
  if (body.fantasyTeamId === undefined) {
    const player = await prisma.player.findUnique({
      where: { id },
      select: { fantasyTeamId: true },
    });
    if (player?.fantasyTeamId) {
      const check = await checkRoleLimit(player.fantasyTeamId, body.role, id);
      if (!check.ok) {
        return NextResponse.json({ error: check.error }, { status: 400 });
      }
    }
  }
  
  data.role = body.role;
}
```

- [ ] **Step 4: Test role-change validation**

Start dev server, create a team with players, assign 3 goalkeepers (P). Try to change a different player's role to P via:
```bash
curl -X PATCH http://localhost:3000/api/players/{playerId} \
  -H "Content-Type: application/json" \
  -d '{"role": "P"}'
```

Expected: 400 with `"Limite raggiunto per ruolo Portieri (3/3)"`

- [ ] **Step 5: Commit**

```bash
git add app/api/players/[id]/route.ts
git commit -m "feat: enforce role limits on pure role changes for assigned players"
```

---

## Task 3: Create POST endpoint for release-all players from team

**Files:**
- Create: `app/api/teams/[id]/release-all/route.ts`

**Interfaces:**
- Consumes: Route param `id` (team UUID)
- Produces: `POST /api/teams/{id}/release-all` → `{ ok: true }` on success, 404 if team not found

- [ ] **Step 1: Create the new route file**

Create `app/api/teams/[id]/release-all/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    await prisma.player.updateMany(
      {
        where: { fantasyTeamId: id },
        data: { fantasyTeamId: null, cost: null },
      }
    );
    return NextResponse.json({ ok: true });
  } catch (error: unknown) {
    if (error instanceof Error && "code" in error && error.code === "P2025") {
      return NextResponse.json({ error: "Team not found" }, { status: 404 });
    }
    throw error;
  }
}
```

- [ ] **Step 2: Test the endpoint**

Start dev server, get a team ID from `/api/teams`, then:
```bash
curl -X POST http://localhost:3000/api/teams/{teamId}/release-all
```

Expected: `{ ok: true }`, all players for that team unassigned

- [ ] **Step 3: Commit**

```bash
git add app/api/teams/[id]/release-all/route.ts
git commit -m "feat: add POST endpoint to release all players from a team"
```

---

## Task 4: Add `getDistinctSerieATeams()` function

**Files:**
- Modify: `lib/teams.ts`

**Interfaces:**
- Consumes: `prisma` from `@/lib/prisma`
- Produces: `async function getDistinctSerieATeams(): Promise<string[]>` → sorted list of unique Serie A team names

- [ ] **Step 1: Add function to `lib/teams.ts`**

At the end of the file, add:

```typescript
export async function getDistinctSerieATeams(): Promise<string[]> {
  const teams = await prisma.player.findMany({
    distinct: ["serieATeam"],
    select: { serieATeam: true },
    orderBy: { serieATeam: "asc" },
  });
  return teams.map((t) => t.serieATeam);
}
```

- [ ] **Step 2: Test locally**

In a test script or browser DevTools, call:
```typescript
const teams = await fetch("/api/teams").then(r => r.json()); // indirect test
```

Or write a quick Node script to import and call the function. Expected: sorted array of unique Serie A team names like `["Atalanta", "Fiorentina", ...]`

- [ ] **Step 3: Commit**

```bash
git add lib/teams.ts
git commit -m "feat: add getDistinctSerieATeams function to fetch unique Serie A teams"
```

---

## Task 5: Create `WipePlayersButton` component

**Files:**
- Create: `app/players/WipePlayersButton.tsx`

**Interfaces:**
- Consumes: `useRouter` from `next/navigation`, `errorMessage` from `@/lib/http`
- Produces: React component that renders a button; on click with double-confirmation (confirm + text prompt "ELIMINA"), sends DELETE to `/api/players`

- [ ] **Step 1: Create the component file**

Create `app/players/WipePlayersButton.tsx`:

```typescript
"use client";

import { useRouter } from "next/navigation";
import { errorMessage } from "@/lib/http";

export default function WipePlayersButton() {
  const router = useRouter();

  async function handleWipe() {
    if (!confirm("Questa azione cancellerà TUTTI i giocatori dal database. Continuare?")) {
      return;
    }

    const confirmation = prompt("Digita ELIMINA per confermare lo svuotamento del database:");
    if (confirmation !== "ELIMINA") {
      return;
    }

    const res = await fetch("/api/players", { method: "DELETE" });
    if (!res.ok) {
      alert(await errorMessage(res));
      return;
    }

    router.refresh();
  }

  return (
    <button
      onClick={handleWipe}
      className="px-3 py-1.5 border border-red-300 text-red-600 rounded text-sm"
    >
      Svuota DB
    </button>
  );
}
```

- [ ] **Step 2: Test the component (visual only)**

Don't actually trigger it — just verify it renders without TypeScript errors when imported.

- [ ] **Step 3: Commit**

```bash
git add app/players/WipePlayersButton.tsx
git commit -m "feat: add WipePlayersButton component with double confirmation"
```

---

## Task 6: Create `ReleasePlayerButton` and `ReleaseAllButton` components

**Files:**
- Create: `app/teams/ReleasePlayerButton.tsx`
- Create: `app/teams/ReleaseAllButton.tsx`

**Interfaces:**
- ReleasePlayerButton consumes: `playerId` (string), `playerName` (string)
- ReleasePlayerButton produces: button that POSTs to `/api/players/{id}` with `{ fantasyTeamId: null }`
- ReleaseAllButton consumes: `teamId` (string), `teamName` (string), `isDisabled` (boolean)
- ReleaseAllButton produces: button that POSTs to `/api/teams/{id}/release-all`

- [ ] **Step 1: Create `ReleasePlayerButton.tsx`**

Create `app/teams/ReleasePlayerButton.tsx`:

```typescript
"use client";

import { useRouter } from "next/navigation";
import { errorMessage } from "@/lib/http";

export default function ReleasePlayerButton({
  playerId,
  playerName,
}: {
  playerId: string;
  playerName: string;
}) {
  const router = useRouter();

  async function handleRelease() {
    if (!confirm(`Svincolare ${playerName}?`)) return;

    const res = await fetch(`/api/players/${playerId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fantasyTeamId: null }),
    });

    if (!res.ok) {
      alert(await errorMessage(res));
      return;
    }

    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={handleRelease}
      className="text-red-600 text-xs hover:underline"
    >
      Svincola
    </button>
  );
}
```

- [ ] **Step 2: Create `ReleaseAllButton.tsx`**

Create `app/teams/ReleaseAllButton.tsx`:

```typescript
"use client";

import { useRouter } from "next/navigation";
import { errorMessage } from "@/lib/http";

export default function ReleaseAllButton({
  teamId,
  teamName,
  isDisabled,
}: {
  teamId: string;
  teamName: string;
  isDisabled: boolean;
}) {
  const router = useRouter();

  async function handleReleaseAll() {
    if (!confirm(`Svincolare tutti i giocatori di ${teamName}?`)) return;

    const res = await fetch(`/api/teams/${teamId}/release-all`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
    });

    if (!res.ok) {
      alert(await errorMessage(res));
      return;
    }

    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={handleReleaseAll}
      disabled={isDisabled}
      className="px-3 py-1.5 border border-orange-300 text-orange-600 rounded text-sm disabled:opacity-40 disabled:cursor-not-allowed"
    >
      Svincola tutto
    </button>
  );
}
```

- [ ] **Step 3: Commit both**

```bash
git add app/teams/ReleasePlayerButton.tsx app/teams/ReleaseAllButton.tsx
git commit -m "feat: add ReleasePlayerButton and ReleaseAllButton components"
```

---

## Task 7: Integrate release buttons in `/teams` page

**Files:**
- Modify: `app/teams/page.tsx`

**Interfaces:**
- Consumes: `ReleasePlayerButton`, `ReleaseAllButton` (new imports)
- Produces: Updated team roster display with per-player "Svincola" button and team-wide "Svincola tutto" button

- [ ] **Step 1: Add imports**

At the top of `app/teams/page.tsx`, add:

```typescript
import ReleasePlayerButton from "./ReleasePlayerButton";
import ReleaseAllButton from "./ReleaseAllButton";
```

- [ ] **Step 2: Add "Svincola tutto" button**

In the team header section (around line 40-42), after the `<DeleteTeamButton>` call, add:

```typescript
<ReleaseAllButton
  teamId={team.id}
  teamName={team.name}
  isDisabled={team.players.length === 0}
/>
```

Result: both "Elimina" and "Svincola tutto" buttons appear side-by-side in the flex row.

- [ ] **Step 3: Add "Svincola" button to player row**

Inside the player loop (around line 51-58), modify the list item:

```typescript
<li key={p.id} className="flex justify-between py-1">
  <div>
    <span>
      {p.name} <span className="text-gray-400 text-sm">({p.serieATeam})</span>
    </span>
  </div>
  <div className="flex items-center gap-2">
    <span className="font-medium">{p.cost}</span>
    <ReleasePlayerButton playerId={p.id} playerName={p.name} />
  </div>
</li>
```

- [ ] **Step 4: Verify visually**

Start dev server, navigate to `/teams`, ensure:
- "Svincola tutto" appears next to "Elimina" (disabled if no players)
- Each player row shows "Svincola" link on the right

- [ ] **Step 5: Commit**

```bash
git add app/teams/page.tsx
git commit -m "feat: integrate release buttons in teams page"
```

---

## Task 8: Update `PlayerFilters` to use dropdown for Serie A teams

**Files:**
- Modify: `app/players/PlayerFilters.tsx`

**Interfaces:**
- Consumes: `serieATeams` prop (string array, sorted)
- Produces: Updated filter UI with `<select>` for Serie A teams instead of text input

- [ ] **Step 1: Update component signature**

Change the component to accept `serieATeams` prop:

```typescript
export default function PlayerFilters({ serieATeams }: { serieATeams: string[] }) {
```

- [ ] **Step 2: Remove serieATeam state and debounce**

Delete these lines (around 17-25 and 45-51):
```typescript
const [serieATeam, setSerieATeam] = useState(searchParams.get("serieATeam") ?? "");

useEffect(() => {
  setSerieATeam(searchParams.get("serieATeam") ?? "");
}, [searchParams]);
```

And remove the `updateDebounced` calls for `serieATeam`.

- [ ] **Step 3: Replace input with select**

Replace the serieATeam `<input>` element (around line 82-90) with:

```typescript
<select
  value={searchParams.get("serieATeam") ?? ""}
  onChange={(e) => update("serieATeam", e.target.value)}
  className="border rounded px-2 py-1 text-sm"
>
  <option value="">Tutte le squadre</option>
  {serieATeams.map((team) => (
    <option key={team} value={team}>
      {team}
    </option>
  ))}
</select>
```

- [ ] **Step 4: Verify no TypeScript errors**

Run `npm run build` or check in IDE. Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add app/players/PlayerFilters.tsx
git commit -m "feat: replace Serie A team text filter with dynamic dropdown"
```

---

## Task 9: Add role select and sorting to `PlayersTable`

**Files:**
- Modify: `app/players/PlayersTable.tsx`

**Interfaces:**
- Consumes: `players` (unchanged), `teams` (unchanged)
- Produces: Sortable table headers, inline `<select>` for role changes, sorted rows via useMemo

- [ ] **Step 1: Add type definitions at top of component**

After imports, add:

```typescript
type SortKey = "name" | "role" | "serieATeam" | "starter" | "fantasyTeam" | "cost" | "watchlist";
type SortState = { key: SortKey; dir: "asc" | "desc" };
```

- [ ] **Step 2: Replace component body with state setup**

Inside the component function, replace the current `const [assigning, ...]` with:

```typescript
const [assigning, setAssigning] = useState<PlayerWithTeam | null>(null);
const [sort, setSort] = useState<SortState | null>(null);
```

- [ ] **Step 3: Add sort logic function**

Before the JSX return, add:

```typescript
const sortedPlayers = useMemo(() => {
  if (!sort) return players;

  const sorted = [...players];
  sorted.sort((a, b) => {
    let aVal: string | number | boolean = "";
    let bVal: string | number | boolean = "";

    switch (sort.key) {
      case "name":
        aVal = a.name.toLowerCase();
        bVal = b.name.toLowerCase();
        break;
      case "role":
        aVal = a.role;
        bVal = b.role;
        break;
      case "serieATeam":
        aVal = a.serieATeam.toLowerCase();
        bVal = b.serieATeam.toLowerCase();
        break;
      case "starter":
        aVal = a.starter ? 1 : 0;
        bVal = b.starter ? 1 : 0;
        break;
      case "fantasyTeam":
        aVal = (a.fantasyTeam?.name ?? "").toLowerCase();
        bVal = (b.fantasyTeam?.name ?? "").toLowerCase();
        break;
      case "cost":
        aVal = a.cost ?? 0;
        bVal = b.cost ?? 0;
        break;
      case "watchlist":
        aVal = a.watchlist ? 1 : 0;
        bVal = b.watchlist ? 1 : 0;
        break;
    }

    if (aVal < bVal) return sort.dir === "asc" ? -1 : 1;
    if (aVal > bVal) return sort.dir === "asc" ? 1 : -1;
    return 0;
  });

  return sorted;
}, [players, sort]);
```

- [ ] **Step 4: Add helper to toggle sort**

Before JSX, add:

```typescript
function toggleSort(key: SortKey) {
  setSort((current) => {
    if (current?.key === key) {
      return { key, dir: current.dir === "asc" ? "desc" : "asc" };
    }
    return { key, dir: "asc" };
  });
}

function getSortIndicator(key: SortKey) {
  if (sort?.key !== key) return "";
  return sort.dir === "asc" ? " ▲" : " ▼";
}
```

- [ ] **Step 5: Update table headers to be clickable**

Replace the `<thead>` section with:

```typescript
<thead>
  <tr className="text-left border-b">
    <th
      className="py-2 cursor-pointer hover:bg-gray-100"
      onClick={() => toggleSort("name")}
    >
      Nome{getSortIndicator("name")}
    </th>
    <th
      className="cursor-pointer hover:bg-gray-100"
      onClick={() => toggleSort("role")}
    >
      Ruolo{getSortIndicator("role")}
    </th>
    <th
      className="cursor-pointer hover:bg-gray-100"
      onClick={() => toggleSort("serieATeam")}
    >
      Squadra Serie A{getSortIndicator("serieATeam")}
    </th>
    <th
      className="cursor-pointer hover:bg-gray-100"
      onClick={() => toggleSort("starter")}
    >
      Titolare{getSortIndicator("starter")}
    </th>
    <th
      className="cursor-pointer hover:bg-gray-100"
      onClick={() => toggleSort("fantasyTeam")}
    >
      Stato{getSortIndicator("fantasyTeam")}
    </th>
    <th
      className="cursor-pointer hover:bg-gray-100"
      onClick={() => toggleSort("cost")}
    >
      Costo{getSortIndicator("cost")}
    </th>
    <th
      className="cursor-pointer hover:bg-gray-100"
      onClick={() => toggleSort("watchlist")}
    >
      Watchlist{getSortIndicator("watchlist")}
    </th>
    <th></th>
  </tr>
</thead>
```

- [ ] **Step 6: Add role change function**

After the existing `unassign` function, add:

```typescript
async function changeRole(player: PlayerWithTeam, newRole: string) {
  const res = await fetch(`/api/players/${player.id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ role: newRole }),
  });
  if (!res.ok) {
    alert(await errorMessage(res));
    return;
  }
  router.refresh();
}
```

- [ ] **Step 7: Update role cell to be inline select**

In the table body row, replace the role cell (around line 77):

```typescript
<td>
  <select
    value={p.role}
    onChange={(e) => changeRole(p, e.target.value)}
    className="border rounded px-1 py-0.5 text-sm"
  >
    {ROLE_ORDER.map((r) => (
      <option key={r} value={r}>
        {r}
      </option>
    ))}
  </select>
</td>
```

- [ ] **Step 8: Update tbody to use sortedPlayers**

Replace the `.map(players` with `.map(sortedPlayers`:

```typescript
{sortedPlayers.map((p) => (
```

- [ ] **Step 9: Add useMemo import**

At the top of the file (after other React imports), add:

```typescript
import { useState, useMemo } from "react";
```

- [ ] **Step 10: Test sorting and role change**

Start dev server, navigate to `/players`:
- Click column headers to sort (verify ▲▼ indicator appears)
- Try changing a player's role (select should update)
- Verify clicking same column twice reverses sort direction

- [ ] **Step 11: Commit**

```bash
git add app/players/PlayersTable.tsx
git commit -m "feat: add inline role select and client-side column sorting"
```

---

## Task 10: Update `/players` page to pass serieATeams and WipePlayersButton

**Files:**
- Modify: `app/players/page.tsx`

**Interfaces:**
- Consumes: New `getDistinctSerieATeams()` function from `lib/teams`
- Produces: Page passes `serieATeams` to PlayerFilters, renders WipePlayersButton

- [ ] **Step 1: Add imports**

At the top of `app/players/page.tsx`, add:

```typescript
import { getDistinctSerieATeams } from "@/lib/teams";
import WipePlayersButton from "./WipePlayersButton";
```

- [ ] **Step 2: Fetch serieATeams in parallel**

Modify the `Promise.all` block (around line 25-28):

```typescript
const [players, teams, serieATeams] = await Promise.all([
  getFilteredPlayers(filters),
  getTeamsWithRoster(),
  getDistinctSerieATeams(),
]);
```

- [ ] **Step 3: Pass serieATeams to PlayerFilters**

Update the `<PlayerFilters />` call to:

```typescript
<PlayerFilters serieATeams={serieATeams} />
```

- [ ] **Step 4: Add WipePlayersButton to header**

In the header section (around line 35-39), modify the button group:

```typescript
<div className="flex gap-2">
  <Link href="/players/import" className="px-3 py-1.5 border rounded text-sm">
    Import
  </Link>
  <AddPlayerForm />
  <WipePlayersButton />
</div>
```

- [ ] **Step 5: Test the page**

Start dev server, navigate to `/players`:
- Verify dropdown for Serie A teams shows correct list
- Verify "Svuota DB" button appears in header
- No console errors

- [ ] **Step 6: Commit**

```bash
git add app/players/page.tsx
git commit -m "feat: integrate WipePlayersButton and dynamic Serie A filter"
```

---

## Self-Review

**Spec coverage:**
- ✅ 1. Svincola giocatore singolo: Task 6 + Task 7
- ✅ 2. Svincola tutti i giocatori di una squadra: Task 3 + Task 6 + Task 7
- ✅ 3. Filtro squadra Serie A dropdown: Task 4 + Task 8 + Task 10
- ✅ 4. Cambio ruolo giocatore: Task 2 + Task 9
- ✅ 5. Svuota database: Task 1 + Task 5 + Task 10
- ✅ 6. Ordinamento colonne: Task 9

**Placeholder scan:** No TODOs, no vague steps. All code blocks complete and runnable.

**Type consistency:**
- `SortKey` type matches all sort cases
- `checkRoleLimit()` signature consistent with usage
- All fetch payloads match API endpoint expectations
- `fantasyTeamId: null` used consistently for unassign/release

**No gaps:** All requirements from spec have corresponding tasks.
