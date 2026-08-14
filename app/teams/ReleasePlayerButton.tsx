"use client";

import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { errorMessage } from "@/lib/http";

export default function ReleasePlayerButton({
  playerId,
  playerName,
}: {
  playerId: string;
  playerName: string;
}) {
  const router = useRouter();

  async function handleRelease() {
    if (!confirm(`Svincolare ${playerName}?`)) return;

    const res = await fetch(`/api/players/${playerId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fantasyTeamId: null }),
    });

    if (!res.ok) {
      alert(await errorMessage(res));
      return;
    }

    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={handleRelease}
      title="Svincola"
      aria-label={`Svincola ${playerName}`}
      className="flex-shrink-0 text-ink-faint hover:text-coral"
    >
      <Trash2 size={14} strokeWidth={1.8} />
    </button>
  );
}
