"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import ConfirmDialog from "@/app/components/ConfirmDialog";

export default function DeleteTeamButton({
  teamId,
  teamName,
  disabled,
}: {
  teamId: string;
  teamName: string;
  disabled: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        disabled={disabled}
        title={disabled ? "Svincola prima tutti i giocatori" : undefined}
        className="rounded-lg border border-line px-3 py-1.5 text-small-dense font-bold text-ink-2 disabled:opacity-40 disabled:cursor-not-allowed"
      >
        Elimina
      </button>
      <ConfirmDialog
        open={open}
        onOpenChange={setOpen}
        title="Eliminare questa squadra?"
        description="L'eliminazione è definitiva: la squadra e la sua storia verranno rimosse."
        confirmWord={teamName}
        confirmLabel="Elimina"
        onConfirm={() => fetch(`/api/teams/${teamId}`, { method: "DELETE" })}
        onConfirmed={() => {
          setOpen(false);
          router.refresh();
        }}
      />
    </>
  );
}
