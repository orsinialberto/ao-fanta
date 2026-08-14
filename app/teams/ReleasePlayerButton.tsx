"use client";

import { useRouter } from "next/navigation";
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
      className="text-red-600 text-xs hover:underline"
    >
      Svincola
    </button>
  );
}
