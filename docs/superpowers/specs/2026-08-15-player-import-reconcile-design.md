# Player import: reconcile (create / update / delete-missing)

## Problem

`POST /api/import` (`app/api/import/route.ts`) currently only inserts new
players and updates existing ones (matched by accent/case-insensitive
normalized name, via `lib/normalize.ts`). Players present in the DB but
absent from the newly imported file are left untouched — they become stale
rows that no longer reflect the current listone (e.g. a player who changed
Serie A team gets updated correctly, but a player dropped from Serie A
entirely stays in the DB forever).

Goal: importing a file should make the DB match the file exactly —
new players created, changed players (role/serieATeam) updated, and
players no longer present in the file deleted.

## Scope

- `app/api/import/route.ts`
- `app/settings/import/page.tsx`
- New shared helper for the diff logic (unit-testable in isolation)

Out of scope: changing file formats/columns, changing the parsing helpers
in `lib/xlsxImport.ts`, adding a `Player` unique constraint (matching stays
name-based, as today).

## Design

### 1. Two-phase API: preview then commit

`POST /api/import` gains a `mode` field in the multipart form data:
`mode=preview` (default) or `mode=commit`.

Both modes parse the uploaded file identically (same `sheetToRows` /
`normalizeRole` / per-row validation as today) and compute the same diff
via a new shared function:

```ts
// lib/importReconcile.ts
function computeReconcile(
  rows: ParsedRow[],           // validated rows: { name, role, serieATeam }
  existing: { id: string; name: string; role: string; serieATeam: string }[]
): {
  toCreate: { name: string; role: string; serieATeam: string }[];
  toUpdate: { id: string; name: string; role: string; serieATeam: string }[];
  toDeleteIds: string[];
  toDeleteNames: string[];
}
```

Matching key: `normalize(name)`, same as today. A row only counts as
`toUpdate` if `role` or `serieATeam` actually differs from the existing
row — unchanged players are a no-op (not counted in create, update, or
delete). Any existing player whose normalized name is not present in the
set of *validated* rows from the file is `toDelete`.

Rows that fail per-row validation (missing name/role/serieATeam, invalid
role) are **not** considered "present in the file" — they stay in the
existing `errors[]` list as today, and the corresponding DB player (if any)
is not protected from deletion by such a row.

- `mode=preview`: runs `computeReconcile`, returns
  `{ toCreate: string[], toUpdate: string[], toDelete: string[], skipped, errors }`
  (name lists only — no ids leaked to client, no writes).
- `mode=commit`: re-runs `computeReconcile` against a **fresh** DB read
  (does not trust a client-supplied diff, so a concurrent change between
  preview and commit can't cause a stale delete), then executes in a
  single `prisma.$transaction`:
  - `createMany` for `toCreate`
  - one `update` per `toUpdate` entry
  - `deleteMany({ where: { id: { in: toDeleteIds } } })`
  Returns `{ created, updated, deleted, skipped, errors }`.

### 2. Client flow (`app/settings/import/page.tsx`)

Existing flow (pick file → map columns → local 3-row preview) is
unchanged up to the submit button. Submit now:

1. POSTs the file + mapping with `mode=preview`.
2. Renders a review screen: counts (N nuovi, N aggiornati, N da eliminare)
   plus the list of names to be deleted (deletions are destructive and
   silently drop `fantasyTeamId`/`cost`/`assignedAt`/`wishlistTier` state
   for that player, so the user must see exactly who is affected).
3. User clicks "Conferma import" → POSTs the same file (kept in
   component state) + mapping with `mode=commit`.
4. Shows final result counts from the commit response.

The file is held in state between the two requests (no re-pick needed);
if the user navigates away or picks a different file, the preview is
discarded and must be redone.

### 3. Deletion policy

Players removed from the file are deleted unconditionally, regardless of
`fantasyTeamId` or `wishlistTier` being set — this is a deliberate product
decision (the imported file is the source of truth for the listone). No
FK cascade concerns: no other table references `Player.id`
(`prisma/schema.prisma:19-35`), so deletion is safe at the DB level; the
only risk is the in-row data loss called out in the confirmation UI above.

### 4. Safety guard: empty/degenerate file

If the parsed file yields zero valid rows (all rows fail validation, or
the sheet is empty), preview returns an explicit error
(`"Nessuna riga valida trovata nel file"`) instead of a diff — this
prevents an empty/corrupt file from producing a preview that would delete
the entire listone. The existing `errors[]` array already surfaces
per-row validation failures for diagnosis.

### 5. Error handling

- Preview/commit both reuse the existing per-row validation and `errors[]`
  reporting — unchanged from today.
- `deleteMany` with an empty `id: { in: [] }` list is a safe no-op.
- No locking: app is single-user in practice; commit always re-diffs
  against current DB state rather than trusting the preview response, so
  the worst case of a race is a stale *preview count* shown to the user,
  never a stale write.

## Testing

- Unit tests for `computeReconcile` (`lib/importReconcile.ts`):
  - unchanged player → not in create/update/delete
  - player with changed `serieATeam` or `role` → in `toUpdate`
  - name not in existing DB → in `toCreate`
  - existing DB player whose name is absent from valid file rows →
    in `toDeleteIds`/`toDeleteNames`
  - a row that fails validation does not protect the matching existing
    player from deletion
- Manual test via the `run` skill: import an initial listone, then import
  a modified file (one player's `serieATeam` changed, one new player
  added, one player removed) — verify preview counts/names, confirm, and
  verify final DB state matches the new file exactly.
