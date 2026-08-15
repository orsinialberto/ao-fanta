"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import ConfirmDialog from "@/app/components/ConfirmDialog";

export default function ReleasePlayerButton({
  playerId,
  playerName,
}: {
  playerId: string;
  playerName: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        title="Svincola"
        aria-label={`Svincola ${playerName}`}
        className="flex-shrink-0 text-ink-3 hover:text-role-a"
      >
        <Trash2 size={14} strokeWidth={1.8} />
      </button>
      <ConfirmDialog
        open={open}
        onOpenChange={setOpen}
        title="Svincolare il giocatore?"
        description={`${playerName} tornerà tra gli svincolati. Potrai riassegnarlo in seguito.`}
        confirmLabel="Svincola"
        onConfirm={() =>
          fetch(`/api/players/${playerId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ fantasyTeamId: null }),
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
