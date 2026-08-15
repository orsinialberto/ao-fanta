import { prisma } from "@/lib/prisma";
import WipePlayersButton from "@/app/players/WipePlayersButton";
import SettingsSection from "./SettingsSection";

export default async function DangerZone() {
  const count = await prisma.player.count();

  return (
    <SettingsSection title="Zona pericolosa">
      <div className="flex items-center gap-4 rounded-lg border border-danger-line bg-danger-bg px-4 py-4">
        <div className="flex-1">
          <p className="text-small font-semibold text-danger">Svuota il listone</p>
          <p className="text-small text-ink-2">
            Cancella tutti i {count} giocatori e le assegnazioni. Non è reversibile.
          </p>
        </div>
        <WipePlayersButton playerCount={count} />
      </div>
    </SettingsSection>
  );
}
