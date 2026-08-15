"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import InlineError from "@/app/components/InlineError";
import { errorMessage } from "@/lib/http";
import type { LeagueSettings } from "@prisma/client";
import SettingsSection from "./SettingsSection";

const LIMIT_FIELDS = [
  { field: "limitP", label: "Por", dot: "bg-role-p" },
  { field: "limitD", label: "Dif", dot: "bg-accent" },
  { field: "limitC", label: "Cen", dot: "bg-role-c" },
  { field: "limitA", label: "Att", dot: "bg-role-a" },
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
    <SettingsSection
      title="Regole lega"
      hint={`rosa da ${form.limitP + form.limitD + form.limitC + form.limitA}`}
      description="Limiti per ruolo e crediti assegnati a ogni squadra nuova."
    >
      <div className="mb-4 grid grid-cols-4 gap-2.5">
        {LIMIT_FIELDS.map(({ field, label, dot }) => (
          <div key={field} className="flex flex-col gap-1.5">
            <label className="flex items-center gap-1.5 text-label">
              <span className={`h-2 w-2 rounded-full ${dot}`} />
              {label}
            </label>
            <input
              type="number"
              min={0}
              value={form[field]}
              onChange={(e) => setForm((f) => ({ ...f, [field]: Number(e.target.value) }))}
              className="w-full rounded-md border border-line-strong bg-surface px-3 py-2 text-center font-mono text-body font-medium tabular-nums transition-colors duration-fast ease-standard focus:border-accent focus:outline-none"
            />
          </div>
        ))}
      </div>

      <div className="mb-4 flex flex-col gap-1.5">
        <label className="text-label text-ink-2">Crediti squadra (default)</label>
        <input
          type="number"
          min={0}
          value={form.defaultCredits}
          onChange={(e) => setForm((f) => ({ ...f, defaultCredits: Number(e.target.value) }))}
          className="w-full rounded-md border border-line-strong bg-surface px-3 py-2 text-center font-mono text-body font-medium tabular-nums transition-colors duration-fast ease-standard focus:border-accent focus:outline-none"
        />
      </div>

      {error && <InlineError message={error} />}

      <button
        onClick={handleSave}
        disabled={saving}
        className="h-8 self-start rounded-md bg-accent px-3 text-small font-semibold text-white transition-colors duration-fast ease-standard hover:bg-accent-hover disabled:opacity-40"
      >
        {saving ? "Salvataggio…" : "Salva modifiche"}
      </button>
    </SettingsSection>
  );
}
