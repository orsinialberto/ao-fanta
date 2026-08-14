"use client";

import { useRouter } from "next/navigation";
import { errorMessage } from "@/lib/http";

export default function ReleaseAllButton({
  teamId,
  teamName,
  isDisabled,
}: {
  teamId: string;
  teamName: string;
  isDisabled: boolean;
}) {
  const router = useRouter();

  async function handleReleaseAll() {
    if (!confirm(`Svincolare tutti i giocatori di ${teamName}?`)) return;

    const res = await fetch(`/api/teams/${teamId}/release-all`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
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
      onClick={handleReleaseAll}
      disabled={isDisabled}
      className="px-3 py-1.5 border border-orange-300 text-orange-600 rounded text-sm disabled:opacity-40 disabled:cursor-not-allowed"
    >
      Svincola tutto
    </button>
  );
}
