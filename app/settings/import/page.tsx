"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import * as XLSX from "xlsx";
import { sheetToRows, normalizeRole } from "@/lib/xlsxImport";
import PageHeader from "@/app/components/PageHeader";
import InlineError from "@/app/components/InlineError";

type ImportType = "listone" | "stats";

const FIELDS: Record<ImportType, string[]> = {
  listone: ["name", "role", "serieATeam"],
  stats: ["name", "mediaVoto", "fantaMedia", "goals", "assists", "appearances"],
};

const FIELD_LABELS: Record<string, string> = {
  name: "name",
  role: "role",
  serieATeam: "serieATeam",
  mediaVoto: "media voto",
  fantaMedia: "media voto fantacalcio",
  goals: "gol",
  assists: "assist",
  appearances: "presenze",
};

type ListonePreviewResult = {
  toCreate: string[];
  toUpdate: string[];
  toDelete: string[];
  skipped: number;
  errors: string[];
};

type ListoneCommitResult = {
  created: number;
  updated: number;
  deleted: number;
  skipped: number;
  errors: string[];
};

type StatsPreviewResult = {
  toUpdate: string[];
  notFound: string[];
  skipped: number;
  errors: string[];
};

type StatsCommitResult = {
  updated: number;
  notFound: number;
  skipped: number;
  errors: string[];
};

export default function ImportPage() {
  const router = useRouter();
  const [importType, setImportType] = useState<ImportType>("listone");
  const [file, setFile] = useState<File | null>(null);
  const [headers, setHeaders] = useState<string[]>([]);
  const [previewRows, setPreviewRows] = useState<Record<string, unknown>[]>([]);
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [preview, setPreview] = useState<ListonePreviewResult | StatsPreviewResult | null>(null);
  const [result, setResult] = useState<ListoneCommitResult | StatsCommitResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fields = FIELDS[importType];

  function resetFileState() {
    setFile(null);
    setHeaders([]);
    setPreviewRows([]);
    setMapping({});
    setPreview(null);
    setResult(null);
    setError(null);
  }

  function handleTypeChange(next: ImportType) {
    setImportType(next);
    resetFileState();
  }

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
      const nextMapping: Record<string, string> = {};
      fields.forEach((field, i) => {
        nextMapping[field] = cols[i] ?? "";
      });
      setMapping(nextMapping);
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
    formData.append("type", importType);

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
      const body = await runImport("preview");
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
      const body = await runImport("commit");
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

  const mappingComplete = fields.every((f) => mapping[f]);

  return (
    <>
      <PageHeader
        title="Import giocatori"
        subtitle="Carica un file CSV o Excel, associa le colonne e conferma l'importazione."
      />
      <div className="max-w-xl space-y-4">
        <div className="flex gap-2">
          {(["listone", "stats"] as const).map((type) => (
            <button
              key={type}
              type="button"
              onClick={() => handleTypeChange(type)}
              aria-pressed={importType === type}
              className={`rounded-md border px-3 py-1.5 text-small transition-colors duration-fast ease-standard ${
                importType === type
                  ? "border-accent bg-accent-bg text-accent"
                  : "border-line text-ink-2 hover:bg-surface-sunk"
              }`}
            >
              {type === "listone" ? "Listone" : "Statistiche"}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-3">
          <label className="cursor-pointer rounded-md border border-line px-3 py-1.5 text-small transition-colors duration-fast ease-standard hover:bg-surface-sunk">
            Scegli file
            <input
              type="file"
              accept=".csv,.xlsx,.xls"
              onChange={handleFileSelect}
              className="hidden"
            />
          </label>
          <span className="text-small text-ink-3">{file ? file.name : "Nessun file selezionato"}</span>
        </div>

        {headers.length > 0 && !preview && (
          <div className="space-y-2 rounded-lg border border-line p-4">
            <p className="text-small text-ink-2">Associa le colonne del file ai campi:</p>
            {fields.map((field) => (
              <div key={field} className="flex items-center gap-2">
                <label className="w-48 text-small">{FIELD_LABELS[field]}</label>
                <select
                  value={mapping[field] ?? ""}
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
            {importType === "listone" && (
              <p className="text-small-dense text-ink-3">
                Ruolo atteso nel file: P/D/C/A (case-insensitive).
              </p>
            )}
            {importType === "stats" && (
              <p className="text-small-dense text-ink-3">
                Le statistiche vengono aggiunte solo ai giocatori già presenti nel listone,
                individuati per nome. Nessun giocatore viene creato o eliminato.
              </p>
            )}

            {previewRows.length > 0 && (
              <div className="space-y-1">
                <p className="text-small text-ink-2">
                  Anteprima (prime {previewRows.length} righe con la mappatura attuale):
                </p>
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse text-small-dense">
                    <thead>
                      <tr className="border-b border-line text-left">
                        {fields.map((field) => (
                          <th key={field} className="py-1 pr-3">
                            {field}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {previewRows.map((row, i) => (
                        <tr key={i} className="border-b border-line">
                          {fields.map((field) => (
                            <td key={field} className="py-1 pr-3">
                              {field === "role"
                                ? mapping.role
                                  ? normalizeRole(String(row[mapping.role] ?? "")) ??
                                    `${String(row[mapping.role] ?? "")} (non valido)`
                                  : "—"
                                : mapping[field]
                                  ? String(row[mapping[field]] ?? "")
                                  : "—"}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            <button
              onClick={handlePreview}
              disabled={loading || !mappingComplete}
              className="rounded-md bg-accent px-3 py-1.5 text-small font-semibold text-on-accent transition-colors duration-fast ease-standard hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-40"
            >
              {loading ? "Analisi..." : "Anteprima modifiche"}
            </button>
          </div>
        )}

        {preview && importType === "listone" && (
          <ListonePreview
            preview={preview as ListonePreviewResult}
            loading={loading}
            onConfirm={handleConfirm}
            onBack={() => setPreview(null)}
          />
        )}

        {preview && importType === "stats" && (
          <StatsPreview
            preview={preview as StatsPreviewResult}
            loading={loading}
            onConfirm={handleConfirm}
            onBack={() => setPreview(null)}
          />
        )}

        {error && <InlineError title="Errore:" message={error} />}

        {result && importType === "listone" && (
          <ListoneResult result={result as ListoneCommitResult} />
        )}

        {result && importType === "stats" && <StatsResult result={result as StatsCommitResult} />}
      </div>
    </>
  );
}

function ListonePreview({
  preview,
  loading,
  onConfirm,
  onBack,
}: {
  preview: ListonePreviewResult;
  loading: boolean;
  onConfirm: () => void;
  onBack: () => void;
}) {
  return (
    <div className="space-y-2 rounded-lg border border-line p-4">
      <p className="text-small text-ink-2">
        Nuovi: {preview.toCreate.length} · Aggiornati: {preview.toUpdate.length} · Da eliminare:{" "}
        {preview.toDelete.length}
      </p>
      {preview.toDelete.length > 0 && (
        <div className="space-y-1">
          <p className="text-small font-semibold text-danger">
            Questi giocatori non sono nel file e verranno eliminati (perdendo assegnazione, costo
            e tier wishlist se presenti):
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
      <PreviewActions loading={loading} onConfirm={onConfirm} onBack={onBack} />
    </div>
  );
}

function StatsPreview({
  preview,
  loading,
  onConfirm,
  onBack,
}: {
  preview: StatsPreviewResult;
  loading: boolean;
  onConfirm: () => void;
  onBack: () => void;
}) {
  return (
    <div className="space-y-2 rounded-lg border border-line p-4">
      <p className="text-small text-ink-2">
        Da aggiornare: {preview.toUpdate.length} · Non trovati nel listone: {preview.notFound.length}
      </p>
      {preview.notFound.length > 0 && (
        <div className="space-y-1">
          <p className="text-small font-semibold text-ink-2">
            Questi nomi del file non corrispondono a nessun giocatore nel listone e verranno
            ignorati:
          </p>
          <ul className="list-inside list-disc text-small-dense text-ink-3">
            {preview.notFound.map((name, i) => (
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
      <PreviewActions loading={loading} onConfirm={onConfirm} onBack={onBack} />
    </div>
  );
}

function PreviewActions({
  loading,
  onConfirm,
  onBack,
}: {
  loading: boolean;
  onConfirm: () => void;
  onBack: () => void;
}) {
  return (
    <div className="flex gap-2">
      <button
        onClick={onConfirm}
        disabled={loading}
        className="rounded-md bg-accent px-3 py-1.5 text-small font-semibold text-on-accent transition-colors duration-fast ease-standard hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-40"
      >
        {loading ? "Importazione..." : "Conferma import"}
      </button>
      <button
        onClick={onBack}
        disabled={loading}
        className="rounded-md border border-line px-3 py-1.5 text-small disabled:cursor-not-allowed disabled:opacity-40"
      >
        Torna alla mappatura
      </button>
    </div>
  );
}

function ListoneResult({ result }: { result: ListoneCommitResult }) {
  return (
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
  );
}

function StatsResult({ result }: { result: StatsCommitResult }) {
  return (
    <div className="space-y-1 rounded-lg border border-line p-4 text-small">
      <p>Aggiornati: {result.updated}</p>
      <p>Non trovati nel listone: {result.notFound}</p>
      <p>Scartati: {result.skipped}</p>
      {result.errors.length > 0 && (
        <ul className="list-inside list-disc text-danger">
          {result.errors.map((err, i) => (
            <li key={i}>{err}</li>
          ))}
        </ul>
      )}
    </div>
  );
}
