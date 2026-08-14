"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { SlidersHorizontal } from "lucide-react";
import { errorMessage } from "@/lib/http";
import type { LeagueSettings } from "@prisma/client";

const LIMIT_FIELDS = [
  { field: "limitP", label: "Por", dot: "bg-teal" },
  { field: "limitD", label: "Dif", dot: "bg-indigo" },
  { field: "limitC", label: "Cen", dot: "bg-amber" },
  { field: "limitA", label: "Att", dot: "bg-coral" },
] as const;

export default function LeagueRulesCard({ settings }: { settings: LeagueSettings }) {
  const router = useRouter();
  const [form, setForm] = useState({
    limitP: settings.limitP,
    limitD: settings.limitD,
    limitC: settings.limitC,
    limitA: settings.limitA,
    defaultCredits: settings.defaultCredits,
  });
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    setSaving(true);
    setError(null);
    const res = await fetch("/api/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setSaving(false);
    if (!res.ok) {
      setError(await errorMessage(res));
      return;
    }
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-3.5 rounded-2xl border border-border bg-surface p-5 shadow-sm">
      <div className="flex items-center gap-2.5">
        <div className="flex h-9 w-9 items-center justify-center rounded-[10px] bg-amber-soft text-amber">
          <SlidersHorizontal size={18} strokeWidth={1.8} />
        </div>
        <div>
          <h3 className="text-[14.5px] font-extrabold">Regole lega</h3>
          <p className="text-xs text-ink-dim">Limiti per ruolo e crediti di default</p>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-2.5">
        {LIMIT_FIELDS.map(({ field, label, dot }) => (
          <div key={field} className="flex flex-col gap-1.5">
            <label className="flex items-center gap-1.5 text-[11px] font-extrabold">
              <span className={`h-[7px] w-[7px] rounded-full ${dot}`} />
              {label}
            </label>
            <input
              type="number"
              min={0}
              value={form[field]}
              onChange={(e) => setForm((f) => ({ ...f, [field]: Number(e.target.value) }))}
              className="rounded-lg border border-border bg-surface-2 px-2.5 py-2 text-center font-mono text-sm tabular-nums"
            />
          </div>
        ))}
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-[11px] font-bold text-ink-dim">Crediti squadra (default)</label>
        <input
          type="number"
          min={0}
          value={form.defaultCredits}
          onChange={(e) => setForm((f) => ({ ...f, defaultCredits: Number(e.target.value) }))}
          className="rounded-lg border border-border bg-surface-2 px-2.5 py-2 text-sm"
        />
      </div>

      {error && <p className="text-sm text-coral">{error}</p>}

      <button
        onClick={handleSave}
        disabled={saving}
        className="self-start rounded-lg bg-indigo px-3.5 py-2 text-[12.5px] font-bold text-white disabled:opacity-50"
      >
        {saving ? "Salvataggio…" : "Salva modifiche"}
      </button>
    </div>
  );
}
