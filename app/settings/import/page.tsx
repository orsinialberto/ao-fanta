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
    if (!file) return;
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
                  {preview.toDelete.map((name, i) => (
                    <li key={`${name}-${i}`}>{name}</li>
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
