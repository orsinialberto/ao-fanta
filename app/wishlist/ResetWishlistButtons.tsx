"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import ConfirmDialog from "@/app/components/ConfirmDialog";
import { TIER_ORDER, TIER_LABELS, type WishlistTier } from "@/lib/wishlist";

type PendingReset = { tier: WishlistTier | null; title: string; description: string } | null;

export default function ResetWishlistButtons() {
  const router = useRouter();
  const [pending, setPending] = useState<PendingReset>(null);

  function resetTier(tier: WishlistTier) {
    setPending({
      tier,
      title: `Resettare la lista ${tier}?`,
      description: `Tutti i giocatori della lista ${tier} — ${TIER_LABELS[tier]} torneranno senza lista.`,
    });
  }

  function resetAll() {
    setPending({
      tier: null,
      title: "Resettare tutte le liste?",
      description: "Tutti i giocatori in una lista (A, B o C) torneranno senza lista.",
    });
  }

  return (
    <>
      <div className="flex gap-2">
        {TIER_ORDER.map((tier) => (
          <button
            key={tier}
            type="button"
            onClick={() => resetTier(tier)}
            className="rounded-md border border-line px-3 py-1.5 text-small-dense font-bold text-ink-3 hover:text-danger"
          >
            Resetta lista {tier}
          </button>
        ))}
        <button
          type="button"
          onClick={resetAll}
          className="rounded-md border border-danger-line px-3 py-1.5 text-small-dense font-bold text-danger hover:bg-danger hover:text-white"
        >
          Resetta tutto
        </button>
      </div>

      <ConfirmDialog
        open={pending !== null}
        onOpenChange={(open) => !open && setPending(null)}
        title={pending?.title ?? ""}
        description={pending?.description ?? ""}
        confirmLabel="Resetta"
        onConfirm={() =>
          fetch("/api/wishlist/reset", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ tier: pending?.tier ?? null }),
          })
        }
        onConfirmed={() => {
          setPending(null);
          router.refresh();
        }}
      />
    </>
  );
}
