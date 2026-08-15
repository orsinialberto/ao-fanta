"use client";

import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/app/components/ui/dialog";
import InlineError from "@/app/components/InlineError";
import { errorMessage } from "@/lib/http";

export default function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmWord,
  confirmLabel,
  onConfirm,
  onConfirmed,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  /** The user must type this exactly before the action unlocks. */
  confirmWord: string;
  confirmLabel: string;
  onConfirm: () => Promise<Response>;
  onConfirmed: () => void;
}) {
  const [typed, setTyped] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    if (open) {
      setTyped("");
      setError(null);
      setPending(false);
    }
  }, [open]);

  const unlocked = typed === confirmWord;

  async function handleConfirm() {
    setPending(true);
    setError(null);
    const res = await onConfirm();
    setPending(false);
    if (!res.ok) {
      setError(await errorMessage(res));
      return;
    }
    onConfirmed();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-3">
          <p className="text-small text-ink-2">{description}</p>

          <div>
            <label
              htmlFor="confirm-word"
              className="mb-1 block text-label uppercase text-ink-3"
            >
              Digita {confirmWord} per confermare
            </label>
            <input
              id="confirm-word"
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
              autoComplete="off"
              className="w-full rounded-md border border-line-strong bg-surface px-3 py-2 text-body transition-colors duration-fast ease-standard focus:border-accent focus:outline-none"
            />
          </div>

          {error && <InlineError message={error} />}

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="text-small text-ink-2 transition-colors duration-fast ease-standard hover:text-ink"
            >
              Annulla
            </button>
            <button
              type="button"
              disabled={!unlocked || pending}
              onClick={handleConfirm}
              className="rounded-md bg-danger px-3 py-2 text-small font-semibold text-white transition-opacity duration-fast ease-standard disabled:opacity-40"
            >
              {confirmLabel}
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
