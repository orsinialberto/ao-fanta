"use client";

import { useState } from "react";
import AddPlayerDialog from "@/app/components/AddPlayerDialog";
import SettingsSection from "./SettingsSection";

export default function PlayersCard() {
  const [open, setOpen] = useState(false);

  return (
    <SettingsSection
      title="Giocatori"
      description="Aggiungi un giocatore assente dal file importato. Serve durante l'asta se viene chiamato un nome che non era nel listone."
    >
      <button
        onClick={() => setOpen(true)}
        className="h-8 self-start rounded-md bg-accent px-3 text-small font-semibold text-white transition-colors duration-fast ease-standard hover:bg-accent-hover"
      >
        Aggiungi giocatore
      </button>
      <AddPlayerDialog open={open} onOpenChange={setOpen} />
    </SettingsSection>
  );
}
