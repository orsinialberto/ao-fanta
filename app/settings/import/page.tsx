"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import * as XLSX from "xlsx";
import { sheetToRows, normalizeRole } from "@/lib/xlsxImport";
import PageHeader from "@/app/components/PageHeader";
import InlineError from "@/app/components/InlineError";

type ImportResult = { imported: number; skipped: number; errors: string[] };

export default function ImportPage() {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [headers, setHeaders] = useState<string[]>([]);
  const [previewRows, setPreviewRows] = useState<Record<string, unknown>[]>([]);
  const [mapping, setMapping] = useState({ name: "", role: "", serieATeam: "" });
  const [result, setResult] = useState<ImportResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = e.target.files?.[0];
    if (!selected) return;

    setFile(selected);
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

  async function handleImport() {
    if (!file) return;
    setLoading(true);
    setResult(null);
    setError(null);

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("mapping", JSON.stringify(mapping));

      const res = await fetch("/api/import", { method: "POST", body: formData });
      if (!res.ok) {
        throw new Error(`Server error: ${res.status}`);
      }
      const body: ImportResult = await res.json();
      setResult(body);
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

        {headers.length > 0 && (
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
              onClick={handleImport}
              disabled={loading || !mapping.name || !mapping.role || !mapping.serieATeam}
              className="rounded-md bg-accent px-3 py-1.5 text-small font-semibold text-white transition-colors duration-fast ease-standard hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-40"
            >
              {loading ? "Importazione..." : "Importa"}
            </button>
          </div>
        )}

        {error && <InlineError title="Errore:" message={error} />}

        {result && (
          <div className="space-y-1 rounded-lg border border-line p-4 text-small">
            <p>Importati: {result.imported}</p>
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
