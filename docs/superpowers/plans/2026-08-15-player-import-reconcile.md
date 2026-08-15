# Player Import Reconcile Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Player import fully reconciles the DB against the uploaded file: new players are created, changed players (role/serieATeam) are updated, and players no longer present in the file are deleted — with a preview/confirm step before anything destructive happens.

**Architecture:** Extract the row-validation and create/update/delete diffing into a new pure, DB-free module (`lib/importReconcile.ts`). `app/api/import/route.ts` gains a `mode` field (`preview` default, `commit`) that both run the same diff but only `commit` writes. `app/settings/import/page.tsx` gains a review screen between column-mapping and the final result.

**Tech Stack:** Next.js API route (`app/api/import/route.ts`), Prisma (SQLite), `xlsx` npm package, Vitest for unit tests, existing test-DB harness (`vitest.globalSetup.ts`, real Prisma against `file:./test.db`).

## Global Constraints

- Matching between file rows and existing DB rows stays name-based via `normalize()` (accent/case-insensitive) — spec explicitly rules out adding a DB unique key.
- Deletion of players missing from the file is unconditional (no protection for rostered/wishlisted players) — confirmed product decision.
- UI copy is Italian, matching existing strings in `app/settings/import/page.tsx` (e.g. "Riga N: nome mancante").
- No new npm dependencies.
- Follow existing test pattern: Vitest, `describe`/`it`/`expect`, real Prisma test DB only where a test actually needs the DB (`lib/players.test.ts` pattern with `beforeAll`/`afterAll` + `__test_...__`-prefixed rows) — `computeReconcile`/`parseAndValidateRows` are pure functions and must be tested with plain in-memory fixtures, no DB.

---

### Task 1: `lib/importReconcile.ts` — pure parse-validate + diff logic

**Files:**
- Create: `lib/importReconcile.ts`
- Test: `lib/importReconcile.test.ts`

**Interfaces:**
- Consumes: `normalize` from `lib/normalize.ts` (`normalize(s: string): string`); `normalizeRole` from `lib/xlsxImport.ts` (`normalizeRole(raw: string): string | null`).
- Produces (used by Task 2):
  - `type ParsedRow = { name: string; role: string; serieATeam: string }`
  - `function parseAndValidateRows(rows: Record<string, unknown>[], mapping: { name: string; role: string; serieATeam: string }): { valid: ParsedRow[]; errors: string[] }`
  - `type ExistingPlayer = { id: string; name: string; role: string; serieATeam: string }`
  - `function computeReconcile(validRows: ParsedRow[], existing: ExistingPlayer[]): { toCreate: ParsedRow[]; toUpdate: (ParsedRow & { id: string })[]; toDeleteIds: string[]; toDeleteNames: string[] }`

- [ ] **Step 1: Write the failing tests**

Create `lib/importReconcile.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { parseAndValidateRows, computeReconcile } from "@/lib/importReconcile";

describe("parseAndValidateRows", () => {
  const mapping = { name: "Nome", role: "Ruolo", serieATeam: "Squadra" };

  it("extracts valid rows using the column mapping", () => {
    const { valid, errors } = parseAndValidateRows(
      [{ Nome: "Osimhen", Ruolo: "ATT", Squadra: "Napoli" }],
      mapping
    );
    expect(valid).toEqual([{ name: "Osimhen", role: "A", serieATeam: "Napoli" }]);
    expect(errors).toEqual([]);
  });

  it("reports a missing name with the 1-indexed-plus-header row number", () => {
    const { valid, errors } = parseAndValidateRows(
      [{ Nome: "", Ruolo: "ATT", Squadra: "Napoli" }],
      mapping
    );
    expect(valid).toEqual([]);
    expect(errors).toEqual(["Riga 2: nome mancante"]);
  });

  it("reports an unrecognized role", () => {
    const { valid, errors } = parseAndValidateRows(
      [{ Nome: "Osimhen", Ruolo: "XX", Squadra: "Napoli" }],
      mapping
    );
    expect(valid).toEqual([]);
    expect(errors).toEqual(['Riga 2: ruolo non valido "XX"']);
  });

  it("reports a missing serieATeam", () => {
    const { valid, errors } = parseAndValidateRows(
      [{ Nome: "Osimhen", Ruolo: "ATT", Squadra: "" }],
      mapping
    );
    expect(valid).toEqual([]);
    expect(errors).toEqual(["Riga 2: squadra Serie A mancante"]);
  });
});

describe("computeReconcile", () => {
  it("leaves an unchanged player out of create/update/delete", () => {
    const existing = [{ id: "1", name: "Osimhen", role: "A", serieATeam: "Napoli" }];
    const validRows = [{ name: "Osimhen", role: "A", serieATeam: "Napoli" }];
    const result = computeReconcile(validRows, existing);
    expect(result.toCreate).toEqual([]);
    expect(result.toUpdate).toEqual([]);
    expect(result.toDeleteIds).toEqual([]);
  });

  it("updates a player whose serieATeam changed", () => {
    const existing = [{ id: "1", name: "Osimhen", role: "A", serieATeam: "Napoli" }];
    const validRows = [{ name: "Osimhen", role: "A", serieATeam: "Galatasaray" }];
    const result = computeReconcile(validRows, existing);
    expect(result.toUpdate).toEqual([{ id: "1", name: "Osimhen", role: "A", serieATeam: "Galatasaray" }]);
    expect(result.toCreate).toEqual([]);
    expect(result.toDeleteIds).toEqual([]);
  });

  it("matches names case/accent-insensitively so it updates rather than duplicates", () => {
    const existing = [{ id: "1", name: "Vlahović", role: "A", serieATeam: "Juventus" }];
    const validRows = [{ name: "vlahovic", role: "A", serieATeam: "Milan" }];
    const result = computeReconcile(validRows, existing);
    expect(result.toUpdate).toEqual([{ id: "1", name: "vlahovic", role: "A", serieATeam: "Milan" }]);
    expect(result.toCreate).toEqual([]);
  });

  it("creates a player whose name isn't in the existing DB", () => {
    const validRows = [{ name: "Nuovo Acquisto", role: "C", serieATeam: "Roma" }];
    const result = computeReconcile(validRows, []);
    expect(result.toCreate).toEqual([{ name: "Nuovo Acquisto", role: "C", serieATeam: "Roma" }]);
    expect(result.toUpdate).toEqual([]);
    expect(result.toDeleteIds).toEqual([]);
  });

  it("deletes an existing player absent from the file", () => {
    const existing = [{ id: "1", name: "Ritirato", role: "A", serieATeam: "Bologna" }];
    const result = computeReconcile([], existing);
    expect(result.toDeleteIds).toEqual(["1"]);
    expect(result.toDeleteNames).toEqual(["Ritirato"]);
  });

  it("does not protect an existing player from deletion when the file has a row for them that failed validation", () => {
    // parseAndValidateRows would have dropped this row (bad role), so it
    // never reaches computeReconcile as a valid row — the player must
    // still be diffed as missing.
    const existing = [{ id: "1", name: "Osimhen", role: "A", serieATeam: "Napoli" }];
    const result = computeReconcile([], existing);
    expect(result.toDeleteIds).toEqual(["1"]);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run lib/importReconcile.test.ts`
Expected: FAIL — `Cannot find module '@/lib/importReconcile'` (or similar), since the module doesn't exist yet.

- [ ] **Step 3: Write the implementation**

Create `lib/importReconcile.ts`:

```ts
import { normalize } from "@/lib/normalize";
import { normalizeRole } from "@/lib/xlsxImport";

export type ParsedRow = { name: string; role: string; serieATeam: string };
export type ExistingPlayer = { id: string; name: string; role: string; serieATeam: string };

/**
 * Extracts and validates rows from a parsed sheet using the user-chosen
 * column mapping. Mirrors the per-row rules the import route has always
 * enforced: name and serieATeam required, role must map to P/D/C/A.
 */
export function parseAndValidateRows(
  rows: Record<string, unknown>[],
  mapping: { name: string; role: string; serieATeam: string }
): { valid: ParsedRow[]; errors: string[] } {
  const valid: ParsedRow[] = [];
  const errors: string[] = [];

  rows.forEach((row, index) => {
    const name = String(row[mapping.name] ?? "").trim();
    const roleRaw = String(row[mapping.role] ?? "").trim();
    const serieATeam = String(row[mapping.serieATeam] ?? "").trim();
    const rowNumber = index + 2; // header row is row 1

    if (!name) {
      errors.push(`Riga ${rowNumber}: nome mancante`);
      return;
    }
    const role = normalizeRole(roleRaw);
    if (!role) {
      errors.push(`Riga ${rowNumber}: ruolo non valido "${roleRaw}"`);
      return;
    }
    if (!serieATeam) {
      errors.push(`Riga ${rowNumber}: squadra Serie A mancante`);
      return;
    }
    valid.push({ name, role, serieATeam });
  });

  return { valid, errors };
}

/**
 * Diffs validated file rows against existing DB players by normalized
 * name. A row only counts as an update if role or serieATeam actually
 * changed. Any existing player whose normalized name isn't among the
 * valid rows is reported for deletion — including players whose only
 * matching file row failed validation (parseAndValidateRows already
 * dropped it, so it's simply absent here).
 */
export function computeReconcile(
  validRows: ParsedRow[],
  existing: ExistingPlayer[]
): {
  toCreate: ParsedRow[];
  toUpdate: (ParsedRow & { id: string })[];
  toDeleteIds: string[];
  toDeleteNames: string[];
} {
  const existingByNormalizedName = new Map(existing.map((p) => [normalize(p.name), p]));

  // Last row wins if the file has duplicate names, matching the
  // pre-existing upsert loop's overwrite behavior.
  const rowsByNormalizedName = new Map<string, ParsedRow>();
  for (const row of validRows) {
    rowsByNormalizedName.set(normalize(row.name), row);
  }

  const toCreate: ParsedRow[] = [];
  const toUpdate: (ParsedRow & { id: string })[] = [];

  for (const [normalizedName, row] of rowsByNormalizedName) {
    const match = existingByNormalizedName.get(normalizedName);
    if (!match) {
      toCreate.push(row);
    } else if (match.role !== row.role || match.serieATeam !== row.serieATeam) {
      toUpdate.push({ ...row, id: match.id });
    }
  }

  const toDeleteIds: string[] = [];
  const toDeleteNames: string[] = [];
  for (const p of existing) {
    if (!rowsByNormalizedName.has(normalize(p.name))) {
      toDeleteIds.push(p.id);
      toDeleteNames.push(p.name);
    }
  }

  return { toCreate, toUpdate, toDeleteIds, toDeleteNames };
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run lib/importReconcile.test.ts`
Expected: PASS, all 10 tests green.

- [ ] **Step 5: Commit**

```bash
git add lib/importReconcile.ts lib/importReconcile.test.ts
git commit -m "feat: add pure parse-validate and reconcile-diff helpers for player import"
```

---

### Task 2: `app/api/import/route.ts` — preview/commit modes

**Files:**
- Modify: `app/api/import/route.ts` (full rewrite of the handler body, same file)

**Interfaces:**
- Consumes: `parseAndValidateRows`, `computeReconcile`, `ParsedRow`, `ExistingPlayer` from `lib/importReconcile.ts` (Task 1). `sheetToRows` from `lib/xlsxImport.ts` (unchanged). `prisma` from `lib/prisma.ts`.
- Produces (used by Task 3):
  - `POST /api/import` with form field `mode` (`"preview"` if omitted or `"commit"`).
  - Preview response `200`: `{ toCreate: string[]; toUpdate: string[]; toDelete: string[]; skipped: number; errors: string[] }`
  - Preview response `400` when zero valid rows: `{ error: string; skipped: number; errors: string[] }`
  - Commit response `200`: `{ created: number; updated: number; deleted: number; skipped: number; errors: string[] }`

- [ ] **Step 1: Replace the route handler**

Replace the full contents of `app/api/import/route.ts`:

```ts
import { NextRequest, NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { prisma } from "@/lib/prisma";
import { sheetToRows } from "@/lib/xlsxImport";
import { parseAndValidateRows, computeReconcile } from "@/lib/importReconcile";

export async function POST(req: NextRequest) {
  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  const mappingRaw = formData.get("mapping") as string | null;
  const mode = (formData.get("mode") as string | null) ?? "preview";

  if (!file || !mappingRaw) {
    return NextResponse.json({ error: "file and mapping are required" }, { status: 400 });
  }
  if (mode !== "preview" && mode !== "commit") {
    return NextResponse.json({ error: "mode must be 'preview' or 'commit'" }, { status: 400 });
  }

  const mapping = JSON.parse(mappingRaw) as {
    name: string;
    role: string;
    serieATeam: string;
  };

  const buffer = Buffer.from(await file.arrayBuffer());
  const workbook = XLSX.read(buffer, { type: "buffer" });
  const sheetName = workbook.SheetNames[0];

  if (!sheetName) {
    return NextResponse.json(
      { error: "Il file non contiene fogli leggibili" },
      { status: 400 }
    );
  }

  const sheet = workbook.Sheets[sheetName];
  const rows = sheetToRows(sheet);
  const { valid, errors } = parseAndValidateRows(rows, mapping);

  if (valid.length === 0) {
    return NextResponse.json(
      { error: "Nessuna riga valida trovata nel file", skipped: errors.length, errors },
      { status: 400 }
    );
  }

  // Upsert/delete-by-name must be accent-insensitive too (SQLite LIKE/equality
  // folds ASCII case but not diacritics) — matching happens in JS via
  // computeReconcile rather than a DB query per row.
  const existingPlayers = await prisma.player.findMany({
    select: { id: true, name: true, role: true, serieATeam: true },
  });

  const { toCreate, toUpdate, toDeleteIds, toDeleteNames } = computeReconcile(
    valid,
    existingPlayers
  );

  if (mode === "preview") {
    return NextResponse.json({
      toCreate: toCreate.map((p) => p.name),
      toUpdate: toUpdate.map((p) => p.name),
      toDelete: toDeleteNames,
      skipped: errors.length,
      errors,
    });
  }

  await prisma.$transaction([
    ...(toCreate.length > 0 ? [prisma.player.createMany({ data: toCreate })] : []),
    ...toUpdate.map((p) =>
      prisma.player.update({ where: { id: p.id }, data: { role: p.role, serieATeam: p.serieATeam } })
    ),
    ...(toDeleteIds.length > 0
      ? [prisma.player.deleteMany({ where: { id: { in: toDeleteIds } } })]
      : []),
  ]);

  return NextResponse.json({
    created: toCreate.length,
    updated: toUpdate.length,
    deleted: toDeleteIds.length,
    skipped: errors.length,
    errors,
  });
}
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors related to `app/api/import/route.ts` or `lib/importReconcile.ts`.

- [ ] **Step 3: Run the full test suite to confirm nothing else broke**

Run: `npx vitest run`
Expected: PASS (all existing suites plus the new `lib/importReconcile.test.ts`).

- [ ] **Step 4: Commit**

```bash
git add app/api/import/route.ts
git commit -m "feat: two-phase preview/commit reconcile in the player import route"
```

---

### Task 3: `app/settings/import/page.tsx` — preview/confirm UI

**Files:**
- Modify: `app/settings/import/page.tsx` (full rewrite, same file)

**Interfaces:**
- Consumes: `POST /api/import` preview and commit responses as defined in Task 2.
- Produces: no new exports (page component only).

- [ ] **Step 1: Replace the page component**

Replace the full contents of `app/settings/import/page.tsx`:

```tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import * as XLSX from "xlsx";
import { sheetToRows, normalizeRole } from "@/lib/xlsxImport";
import PageHeader from "@/app/components/PageHeader";
import InlineError from "@/app/components/InlineError";

type PreviewResult = {
  toCreate: string[];
  toUpdate: string[];
  toDelete: string[];
  skipped: number;
  errors: string[];
};

type CommitResult = {
  created: number;
  updated: number;
  deleted: number;
  skipped: number;
  errors: string[];
};

export default function ImportPage() {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [headers, setHeaders] = useState<string[]>([]);
  const [previewRows, setPreviewRows] = useState<Record<string, unknown>[]>([]);
  const [mapping, setMapping] = useState({ name: "", role: "", serieATeam: "" });
  const [preview, setPreview] = useState<PreviewResult | null>(null);
  const [result, setResult] = useState<CommitResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = e.target.files?.[0];
    if (!selected) return;

    setFile(selected);
    setPreview(null);
    setResult(null);
    setError(null);

    try {
      const buffer = await selected.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: "array" });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const rows = sheetToRows(sheet);
      const cols = rows.length > 0 ? Object.keys(rows[0]) : [];
      setHeaders(cols);
      setPreviewRows(rows.slice(0, 3));
      setMapping({ name: cols[0] ?? "", role: cols[1] ?? "", serieATeam: cols[2] ?? "" });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Errore durante la lettura del file";
      setError(message);
      setHeaders([]);
      setPreviewRows([]);
      setFile(null);
    }
  }

  async function runImport(mode: "preview" | "commit") {
    if (!file) return null;
    const formData = new FormData();
    formData.append("file", file);
    formData.append("mapping", JSON.stringify(mapping));
    formData.append("mode", mode);

    const res = await fetch("/api/import", { method: "POST", body: formData });
    const body = await res.json();
    if (!res.ok) {
      throw new Error(body.error ?? `Server error: ${res.status}`);
    }
    return body;
  }

  async function handlePreview() {
    if (!file) return;
    setLoading(true);
    setError(null);
    setPreview(null);

    try {
      const body = (await runImport("preview")) as PreviewResult;
      setPreview(body);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Errore durante l'anteprima";
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  async function handleConfirm() {
    setLoading(true);
    setError(null);

    try {
      const body = (await runImport("commit")) as CommitResult;
      setResult(body);
      setPreview(null);
      router.refresh();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Errore durante l'importazione";
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <PageHeader
        title="Import giocatori"
        subtitle="Carica un file CSV o Excel, associa le colonne e conferma l'importazione."
      />
      <div className="max-w-xl space-y-4">
        <input type="file" accept=".csv,.xlsx,.xls" onChange={handleFileSelect} />

        {headers.length > 0 && !preview && (
          <div className="space-y-2 rounded-lg border border-line p-4">
            <p className="text-small text-ink-2">Associa le colonne del file ai campi:</p>
            {(["name", "role", "serieATeam"] as const).map((field) => (
              <div key={field} className="flex items-center gap-2">
                <label className="w-32 text-small">{field}</label>
                <select
                  value={mapping[field]}
                  onChange={(e) => setMapping((m) => ({ ...m, [field]: e.target.value }))}
                  className="rounded-md border border-line bg-surface px-2 py-1 text-small"
                >
                  <option value="">-- seleziona colonna --</option>
                  {headers.map((h) => (
                    <option key={h} value={h}>
                      {h}
                    </option>
                  ))}
                </select>
              </div>
            ))}
            <p className="text-small-dense text-ink-3">
              Ruolo atteso nel file: P/D/C/A (case-insensitive).
            </p>

            {previewRows.length > 0 && (
              <div className="space-y-1">
                <p className="text-small text-ink-2">
                  Anteprima (prime {previewRows.length} righe con la mappatura attuale):
                </p>
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse text-small-dense">
                    <thead>
                      <tr className="border-b border-line text-left">
                        <th className="py-1 pr-3">name</th>
                        <th className="py-1 pr-3">role</th>
                        <th className="py-1 pr-3">serieATeam</th>
                      </tr>
                    </thead>
                    <tbody>
                      {previewRows.map((row, i) => (
                        <tr key={i} className="border-b border-line">
                          <td className="py-1 pr-3">
                            {mapping.name ? String(row[mapping.name] ?? "") : "—"}
                          </td>
                          <td className="py-1 pr-3">
                            {mapping.role
                              ? normalizeRole(String(row[mapping.role] ?? "")) ??
                                `${String(row[mapping.role] ?? "")} (non valido)`
                              : "—"}
                          </td>
                          <td className="py-1 pr-3">
                            {mapping.serieATeam ? String(row[mapping.serieATeam] ?? "") : "—"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            <button
              onClick={handlePreview}
              disabled={loading || !mapping.name || !mapping.role || !mapping.serieATeam}
              className="rounded-md bg-accent px-3 py-1.5 text-small font-semibold text-white transition-colors duration-fast ease-standard hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-40"
            >
              {loading ? "Analisi..." : "Anteprima modifiche"}
            </button>
          </div>
        )}

        {preview && (
          <div className="space-y-2 rounded-lg border border-line p-4">
            <p className="text-small text-ink-2">
              Nuovi: {preview.toCreate.length} · Aggiornati: {preview.toUpdate.length} · Da
              eliminare: {preview.toDelete.length}
            </p>
            {preview.toDelete.length > 0 && (
              <div className="space-y-1">
                <p className="text-small font-semibold text-danger">
                  Questi giocatori non sono nel file e verranno eliminati (perdendo assegnazione,
                  costo e tier wishlist se presenti):
                </p>
                <ul className="list-inside list-disc text-small-dense text-danger">
                  {preview.toDelete.map((name) => (
                    <li key={name}>{name}</li>
                  ))}
                </ul>
              </div>
            )}
            {preview.errors.length > 0 && (
              <ul className="list-inside list-disc text-small-dense text-danger">
                {preview.errors.map((err, i) => (
                  <li key={i}>{err}</li>
                ))}
              </ul>
            )}
            <div className="flex gap-2">
              <button
                onClick={handleConfirm}
                disabled={loading}
                className="rounded-md bg-accent px-3 py-1.5 text-small font-semibold text-white transition-colors duration-fast ease-standard hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-40"
              >
                {loading ? "Importazione..." : "Conferma import"}
              </button>
              <button
                onClick={() => setPreview(null)}
                disabled={loading}
                className="rounded-md border border-line px-3 py-1.5 text-small disabled:cursor-not-allowed disabled:opacity-40"
              >
                Torna alla mappatura
              </button>
            </div>
          </div>
        )}

        {error && <InlineError title="Errore:" message={error} />}

        {result && (
          <div className="space-y-1 rounded-lg border border-line p-4 text-small">
            <p>Nuovi: {result.created}</p>
            <p>Aggiornati: {result.updated}</p>
            <p>Eliminati: {result.deleted}</p>
            <p>Scartati: {result.skipped}</p>
            {result.errors.length > 0 && (
              <ul className="list-inside list-disc text-danger">
                {result.errors.map((err, i) => (
                  <li key={i}>{err}</li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>
    </>
  );
}
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors in `app/settings/import/page.tsx`.

- [ ] **Step 3: Commit**

```bash
git add app/settings/import/page.tsx
git commit -m "feat: add preview/confirm review screen to the player import page"
```

---

### Task 4: Manual end-to-end verification

**Files:** none (verification only, no code changes)

**Interfaces:**
- Consumes: the running dev server (`npm run dev`), `POST /api/import` from Task 2, the UI from Task 3.

- [ ] **Step 1: Create two fixture CSVs in the scratchpad**

Use a `__test_import_` name prefix so cleanup is unambiguous and nothing collides with real listone data. Create `/tmp/listone-v1.csv`:

```csv
Nome,Ruolo,Squadra
__test_import_unchanged__,ATT,Napoli
__test_import_will_change_team__,DIF,Roma
__test_import_will_be_removed__,CEN,Lazio
```

Create `/tmp/listone-v2.csv`:

```csv
Nome,Ruolo,Squadra
__test_import_unchanged__,ATT,Napoli
__test_import_will_change_team__,DIF,Milan
__test_import_new_player__,ATT,Inter
```

- [ ] **Step 2: Start the app and import v1**

Use the `run` skill to start the dev server. In the browser, go to `/settings/import`, pick `/tmp/listone-v1.csv`, map `Nome`→name, `Ruolo`→role, `Squadra`→serieATeam, click "Anteprima modifiche".

Expected preview: `Nuovi: 3 · Aggiornati: 0 · Da eliminare: 0` (assuming a clean starting point — if not, the three `__test_import_` names should still show as new). Click "Conferma import".

Expected result: `Nuovi: 3`, `Aggiornati: 0`, `Eliminati: 0`, `Scartati: 0`.

- [ ] **Step 3: Import v2 and verify the reconcile**

On `/settings/import`, pick `/tmp/listone-v2.csv`, same column mapping, click "Anteprima modifiche".

Expected preview:
- `Nuovi: 1` (`__test_import_new_player__`)
- `Aggiornati: 1` (`__test_import_will_change_team__`, Roma → Milan)
- `Da eliminare: 1`, listing `__test_import_will_be_removed__`

Click "Conferma import". Expected result: `Nuovi: 1`, `Aggiornati: 1`, `Eliminati: 1`, `Scartati: 0`.

- [ ] **Step 4: Verify final DB state matches v2 exactly**

Go to `/players` (or wherever the listone is listed) and confirm: `__test_import_unchanged__` present with Napoli; `__test_import_will_change_team__` present with Milan (not Roma); `__test_import_will_be_removed__` absent; `__test_import_new_player__` present with Inter.

- [ ] **Step 5: Clean up the test fixtures from the dev DB**

```bash
node -e "
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
prisma.player.deleteMany({ where: { name: { startsWith: '__test_import_' } } })
  .then((r) => { console.log('deleted', r.count); return prisma.\$disconnect(); });
"
```

Expected output: `deleted 4`. Re-check `/players` to confirm the fixtures are gone and no real data was touched.
