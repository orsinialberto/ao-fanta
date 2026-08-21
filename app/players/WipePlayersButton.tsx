"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import ConfirmDialog from "@/app/components/ConfirmDialog";

export default function WipePlayersButton({ playerCount }: { playerCount: number }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="h-8 shrink-0 rounded-md border border-danger-line bg-surface px-3 text-small font-semibold text-danger transition-colors duration-fast ease-standard hover:bg-danger hover:text-on-danger"
      >
        Svuota
      </button>

      <ConfirmDialog
        open={open}
        onOpenChange={setOpen}
        title="Svuota il listone"
        description={`Cancella tutti i ${playerCount} giocatori e le assegnazioni delle squadre. Non è reversibile.`}
        confirmWord="ELIMINA"
        confirmLabel="Svuota il listone"
        onConfirm={() => fetch("/api/players", { method: "DELETE" })}
        onConfirmed={() => {
          setOpen(false);
          router.refresh();
        }}
      />
    </>
  );
}
