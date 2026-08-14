import * as XLSX from "xlsx";

/**
 * Some exports (e.g. Fantacalcio quotazioni) prefix the sheet with a
 * single-cell title row before the real header row, which breaks
 * xlsx's default "first row is header" assumption. Scan down for the
 * first row with more than one non-empty cell and treat that as the
 * header; rows above it are dropped along with the title.
 */
export function sheetToRows(sheet: XLSX.WorkSheet): Record<string, unknown>[] {
  const raw: unknown[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "" });
  const headerIndex = raw.findIndex(
    (row) => row.filter((cell) => cell !== "").length > 1
  );
  if (headerIndex === -1) return [];

  const headers = raw[headerIndex].map((h) => String(h));
  return raw
    .slice(headerIndex + 1)
    .filter((row) => row.some((cell) => cell !== ""))
    .map((row) => {
      const obj: Record<string, unknown> = {};
      headers.forEach((header, i) => {
        if (!header) return;
        obj[header] = row[i] ?? "";
      });
      return obj;
    });
}

const ROLE_ALIASES: Record<string, string> = {
  P: "P",
  POR: "P",
  D: "D",
  DIF: "D",
  C: "C",
  CEN: "C",
  CC: "C",
  A: "A",
  ATT: "A",
  // English aliases, kept for backward compatibility
  GK: "P",
  DEF: "D",
  MID: "C",
  FWD: "A",
};

/** Maps a raw role code (Italian Fantacalcio notation or English) to the app's canonical P/D/C/A, or null if unrecognized. */
export function normalizeRole(raw: string): string | null {
  return ROLE_ALIASES[raw.trim().toUpperCase()] ?? null;
}
