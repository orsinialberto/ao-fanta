"use client";

import { useRouter } from "next/navigation";
import { errorMessage } from "@/lib/http";

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
      alert(await errorMessage(res));
      return;
    }
    router.refresh();
  }

  return (
    <button
      onClick={handleDelete}
      disabled={disabled}
      title={disabled ? "Svincola prima tutti i giocatori" : undefined}
      className="rounded-lg border border-border px-3 py-1.5 text-[12px] font-bold text-ink-dim disabled:opacity-40 disabled:cursor-not-allowed"
    >
      Elimina
    </button>
  );
}
