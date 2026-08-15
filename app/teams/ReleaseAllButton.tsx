"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import ConfirmDialog from "@/app/components/ConfirmDialog";

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
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        disabled={isDisabled}
        className="rounded-lg border border-role-a px-3 py-1.5 text-small-dense font-bold text-role-a disabled:opacity-40 disabled:cursor-not-allowed"
      >
        Svincola tutto
      </button>
      <ConfirmDialog
        open={open}
        onOpenChange={setOpen}
        title="Svincolare tutti i giocatori?"
        description={`Tutti i giocatori di ${teamName} torneranno svincolati. Potrai riassegnarli in seguito.`}
        confirmLabel="Svincola tutto"
        onConfirm={() =>
          fetch(`/api/teams/${teamId}/release-all`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
          })
        }
        onConfirmed={() => {
          setOpen(false);
          router.refresh();
        }}
      />
    </>
  );
}
