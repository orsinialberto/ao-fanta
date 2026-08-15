"use client";

import { useRef, useState } from "react";
import { errorMessage } from "@/lib/http";
import SettingsSection from "./SettingsSection";

export default function MarkStartersCard() {
  const [result, setResult] = useState<{ updatedCount: number; unmatchedNames: string[] } | null>(
    null
  );
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleFile(file: File) {
    setPending(true);
    setError("");
    setResult(null);

    const text = await file.text();
    const names = text
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line.length > 0);

    const res = await fetch("/api/players/mark-starters", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ names }),
    });

    setPending(false);
    if (inputRef.current) inputRef.current.value = "";

    if (!res.ok) {
      setError(await errorMessage(res));
      return;
    }
    setResult(await res.json());
  }

  return (
    <SettingsSection
      title="Segna titolari"
      description="Carica un file .txt con un nome giocatore per riga: chi viene trovato a listone viene segnato come titolare. Chi era già titolare non cambia, chi non è nella lista non viene toccato."
    >
      <input
        ref={inputRef}
        type="file"
        accept=".txt"
        disabled={pending}
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFile(file);
        }}
        className="text-small text-ink-2 file:mr-3 file:h-8 file:rounded-md file:border-0 file:bg-accent file:px-3 file:text-small file:font-semibold file:text-white file:transition-colors file:duration-fast file:ease-standard hover:file:bg-accent-hover"
      />

      {result && (
        <div className="text-small text-ink-2">
          <p>{result.updatedCount} giocatori segnati titolari.</p>
          {result.unmatchedNames.length > 0 && (
            <p className="mt-1">
              Non trovati: {result.unmatchedNames.join(", ")}
            </p>
          )}
        </div>
      )}

      {error && <p className="text-xs text-danger">{error}</p>}
    </SettingsSection>
  );
}
