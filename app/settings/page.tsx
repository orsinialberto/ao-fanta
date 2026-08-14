import { getLeagueSettings } from "@/lib/leagueSettings";
import LeagueRulesCard from "./LeagueRulesCard";
import ListoneCard from "./ListoneCard";
import TeamsCard from "./TeamsCard";
import PlayersCard from "./PlayersCard";
import EditPlayerCard from "./EditPlayerCard";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const settings = await getLeagueSettings();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-[22px] font-extrabold">Impostazioni</h1>
        <p className="text-sm text-ink-dim">Configurazione della lega e gestione dei dati.</p>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <ListoneCard />
        <TeamsCard />
        <PlayersCard />
        <EditPlayerCard />
        <LeagueRulesCard settings={settings} />
      </div>
    </div>
  );
}
