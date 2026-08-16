import { prisma } from "@/lib/prisma";
import WipePlayersButton from "@/app/players/WipePlayersButton";
import ResetStartersButton from "@/app/players/ResetStartersButton";
import ReleaseAllTeamsButton from "@/app/players/ReleaseAllTeamsButton";
import SettingsSection from "./SettingsSection";

export default async function DangerZone() {
  const count = await prisma.player.count();
  const starterCount = await prisma.player.count({ where: { starter: true } });
  const assignedCount = await prisma.player.count({ where: { fantasyTeamId: { not: null } } });

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

      <div className="flex items-center gap-4 rounded-lg border border-danger-line bg-danger-bg px-4 py-4">
        <div className="flex-1">
          <p className="text-small font-semibold text-danger">Resetta titolari</p>
          <p className="text-small text-ink-2">
            Rimuove lo stato di titolare da tutti i {starterCount} giocatori segnati come tali.
          </p>
        </div>
        <ResetStartersButton starterCount={starterCount} />
      </div>

      <div className="flex items-center gap-4 rounded-lg border border-danger-line bg-danger-bg px-4 py-4">
        <div className="flex-1">
          <p className="text-small font-semibold text-danger">Svincola tutte le squadre</p>
          <p className="text-small text-ink-2">
            Svincola tutti i {assignedCount} giocatori assegnati, in ogni squadra. Le squadre
            restano, solo i giocatori tornano liberi.
          </p>
        </div>
        <ReleaseAllTeamsButton assignedCount={assignedCount} />
      </div>
    </SettingsSection>
  );
}
