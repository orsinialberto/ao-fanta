# Mark starters from a name list, and reset all starters

## Problem

`Player.starter` (mostrato come "Titolare" in UI) today can only be toggled
one player at a time, via `EditPlayerCard.tsx` → `PATCH /api/players/[id]`.
There's no way to mark many players as starters in one action, and no way
to clear the flag from the whole roster at once. Goal: let the user upload
a plain-text list of player names and mark every matched player as starter
(without touching anyone else's flag), and separately let them reset
`starter` to `false` for every player in one confirmed action.

## Scope

- New: `lib/starters.ts` (pure matching helper, unit-tested)
- New: `app/api/players/mark-starters/route.ts`
- New: `app/api/players/reset-starters/route.ts`
- New: `app/settings/MarkStartersCard.tsx`
- New: `app/players/ResetStartersButton.tsx`
- Edited: `app/settings/page.tsx` (mount new card), `app/settings/DangerZone.tsx`
  (add reset row)

Out of scope: xlsx/csv parsing (plain `.txt` only, one name per line),
changing the existing single-player toggle in `EditPlayerCard.tsx`,
any change to `Player.starter`'s meaning or default.

## Design

### 1. Matching helper (`lib/starters.ts`)

```ts
export function matchStarters(
  names: string[],
  players: { id: string; name: string }[]
): { matchedIds: string[]; unmatchedNames: string[] }
```

- Names are matched against players via `normalize()` (`lib/normalize.ts`,
  same accent/case-insensitive comparison already used by
  `getFilteredPlayers` and `computeReconcile`).
- Build a `Map<normalizedName, playerId>` from `players` once, then look up
  each input name. A name that matches no player goes to `unmatchedNames`
  (original, un-normalized string, for display). A name that matches
  is added to `matchedIds` (deduped — a repeated name in the file, or two
  input names normalizing to the same player, only counts once).
- If two DB players normalize to the same name (pre-existing duplicate,
  same situation `computeReconcile` already handles), the first one
  encountered wins the match — consistent with existing behavior elsewhere,
  not a new edge case introduced here.
- Pure function, no DB/IO — matches the `computeReconcile` pattern.

### 2. `POST /api/players/mark-starters`

Body: `{ names: string[] }` (already split/trimmed/non-empty client-side).

1. `prisma.player.findMany({ select: { id: true, name: true } })`
2. `matchStarters(names, players)`
3. `prisma.player.updateMany({ where: { id: { in: matchedIds } }, data: { starter: true } })`
   — only sets `true`; players not in the list, including existing starters,
   are never modified. Empty `matchedIds` is a safe no-op update.
4. Returns `{ updatedCount: number, unmatchedNames: string[] }`.

No preview/commit split here (unlike the import reconcile flow) — marking
starters is additive and non-destructive, so there's nothing to confirm
before applying.

### 3. `POST /api/players/reset-starters`

No body. `prisma.player.updateMany({ where: { starter: true }, data: { starter: false } })`.
Returns `{ count: number }` (players actually reset).

### 4. `MarkStartersCard.tsx` (new `SettingsSection`, mounted in
`app/settings/page.tsx` after `EditPlayerCard`)

- `<input type="file" accept=".txt">`.
- On file pick: `file.text()`, split on `\n`, `.trim()` each line, drop
  empty lines → `names: string[]`.
- POST to `/api/players/mark-starters` with `{ names }`.
- Show result: "N giocatori segnati titolari." Below it, if
  `unmatchedNames.length > 0`, a list: "Non trovati: ..." so the user can
  fix the file and re-upload (partial success — matched names are already
  applied, this is informational not a rollback).
- Error state (network/500) shown via existing `errorMessage(res)` helper,
  same as `EditPlayerCard.tsx`.

### 5. Reset row in `DangerZone.tsx`

- `DangerZone` (already an async server component) also fetches
  `prisma.player.count({ where: { starter: true } })`.
- New row, same visual pattern as the existing "Svuota il listone" row:
  description "Rimuove lo stato di titolare da tutti i {count} giocatori."
  + `ResetStartersButton.tsx` (mirrors `WipePlayersButton.tsx`):
  `ConfirmDialog` with `confirmWord="RESET"`, `onConfirm` POSTs
  `/api/players/reset-starters`, `onConfirmed` calls `router.refresh()`.

### 6. Error handling

- `mark-starters`: missing/non-array `names` → 400. Empty array after
  filtering → still a valid request, `updatedCount: 0`.
- `reset-starters`: no input to validate.
- Both routes are plain `updateMany` calls — no transaction needed (single
  statement each, no multi-step invariant to protect).

## Testing

- Unit tests for `matchStarters` (`lib/starters.test.ts`):
  - exact name match
  - accent/case-insensitive match (e.g. "Vlahovic" matches "Vlahović")
  - name with no match → in `unmatchedNames`
  - duplicate name in input list → `matchedIds` contains the player once
  - two DB players normalizing to the same name → first one matched
  - empty `names` list → both outputs empty
- Route tests for `mark-starters` and `reset-starters`, matching the level
  of coverage the recent player-import work added for its routes.
- Manual test via the `run` skill: upload a `.txt` with a mix of matching
  and non-matching names, verify starters flip and unmatched list shows;
  then use the reset button and verify all `starter` flags clear.
