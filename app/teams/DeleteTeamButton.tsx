"use client";

import { useRouter } from "next/navigation";

export default function DeleteTeamButton({
  teamId,
  disabled,
}: {
  teamId: string;
  disabled: boolean;
}) {
  const router = useRouter();

  async function handleDelete() {
    if (!confirm("Eliminare questa squadra?")) return;

    const res = await fetch(`/api/teams/${teamId}`, { method: "DELETE" });
    if (!res.ok) {
      const body = await res.json();
      alert(body.error ?? "Errore");
      return;
    }
    router.refresh();
  }

  return (
    <button
      onClick={handleDelete}
      disabled={disabled}
      title={disabled ? "Svincola prima tutti i giocatori" : undefined}
      className="px-3 py-1.5 border border-red-300 text-red-600 rounded text-sm disabled:opacity-40 disabled:cursor-not-allowed"
    >
      Elimina
    </button>
  );
}
