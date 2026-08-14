"use client";

import { useRouter } from "next/navigation";
import { errorMessage } from "@/lib/http";

export default function WipePlayersButton() {
  const router = useRouter();

  async function handleWipe() {
    if (!confirm("Questa azione cancellerà TUTTI i giocatori dal database. Continuare?")) {
      return;
    }

    const confirmation = prompt("Digita ELIMINA per confermare lo svuotamento del database:");
    if (confirmation !== "ELIMINA") {
      return;
    }

    const res = await fetch("/api/players", { method: "DELETE" });
    if (!res.ok) {
      alert(await errorMessage(res));
      return;
    }

    router.refresh();
  }

  return (
    <button
      onClick={handleWipe}
      className="px-3 py-1.5 border border-red-300 text-red-600 rounded text-sm"
    >
      Svuota DB
    </button>
  );
}
