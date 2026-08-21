"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import ConfirmDialog from "@/app/components/ConfirmDialog";

export default function ResetStartersButton({ starterCount }: { starterCount: number }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="h-8 shrink-0 rounded-md border border-danger-line bg-surface px-3 text-small font-semibold text-danger transition-colors duration-fast ease-standard hover:bg-danger hover:text-on-danger"
      >
        Resetta
      </button>

      <ConfirmDialog
        open={open}
        onOpenChange={setOpen}
        title="Resetta titolari"
        description={`Rimuove lo stato di titolare da tutti i ${starterCount} giocatori segnati come tali.`}
        confirmWord="RESET"
        confirmLabel="Resetta titolari"
        onConfirm={() => fetch("/api/players/reset-starters", { method: "POST" })}
        onConfirmed={() => {
          setOpen(false);
          router.refresh();
        }}
      />
    </>
  );
}
