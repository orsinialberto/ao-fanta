import { getLeagueSettings } from "@/lib/leagueSettings";
import PageHeader from "@/app/components/PageHeader";
import LeagueRulesCard from "./LeagueRulesCard";
import ListoneCard from "./ListoneCard";
import TeamsCard from "./TeamsCard";
import PlayersCard from "./PlayersCard";
import EditPlayerCard from "./EditPlayerCard";
import MarkStartersCard from "./MarkStartersCard";
import DangerZone from "./DangerZone";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const settings = await getLeagueSettings();

  return (
    <>
      <PageHeader
        title="Impostazioni"
        subtitle="Configurazione della lega e gestione dei dati."
      />
      <div className="flex max-w-[640px] flex-col gap-10">
        <LeagueRulesCard settings={settings} />
        <TeamsCard />
        <ListoneCard />
        <PlayersCard />
        <EditPlayerCard />
        <MarkStartersCard />
        <DangerZone />
      </div>
    </>
  );
}
