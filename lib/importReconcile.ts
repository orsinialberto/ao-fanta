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
  // If multiple existing DB players normalize to the same name (an
  // accidental duplicate — POST /api/players has no uniqueness check), only
  // the first one encountered is eligible to be matched against the file;
  // every other duplicate can never be "the" match, so it's routed straight
  // to deletion regardless of whether the file has a row for that name. This
  // guarantees at most one DB row per normalized name survives an import.
  const existingByNormalizedName = new Map<string, ExistingPlayer>();
  const toDeleteIds: string[] = [];
  const toDeleteNames: string[] = [];
  for (const p of existing) {
    const key = normalize(p.name);
    if (existingByNormalizedName.has(key)) {
      toDeleteIds.push(p.id);
      toDeleteNames.push(p.name);
    } else {
      existingByNormalizedName.set(key, p);
    }
  }

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

  for (const [normalizedName, p] of existingByNormalizedName) {
    if (!rowsByNormalizedName.has(normalizedName)) {
      toDeleteIds.push(p.id);
      toDeleteNames.push(p.name);
    }
  }

  return { toCreate, toUpdate, toDeleteIds, toDeleteNames };
}
