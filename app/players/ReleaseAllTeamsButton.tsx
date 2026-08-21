"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import ConfirmDialog from "@/app/components/ConfirmDialog";

export default function ReleaseAllTeamsButton({ assignedCount }: { assignedCount: number }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="h-8 shrink-0 rounded-md border border-danger-line bg-surface px-3 text-small font-semibold text-danger transition-colors duration-fast ease-standard hover:bg-danger hover:text-on-danger"
      >
        Svincola tutti
      </button>

      <ConfirmDialog
        open={open}
        onOpenChange={setOpen}
        title="Svincola tutte le squadre"
        description={`Tutti i ${assignedCount} giocatori assegnati torneranno svincolati, in ogni squadra. Potrai riassegnarli in seguito.`}
        confirmWord="SVINCOLA"
        confirmLabel="Svincola tutti"
        onConfirm={() => fetch("/api/players/release-all", { method: "POST" })}
        onConfirmed={() => {
          setOpen(false);
          router.refresh();
        }}
      />
    </>
  );
}
