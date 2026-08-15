import { getTeamsWithRoster } from "@/lib/teams";
import TeamForm from "@/app/teams/TeamForm";
import ReleaseAllButton from "@/app/teams/ReleaseAllButton";
import DeleteTeamButton from "@/app/teams/DeleteTeamButton";
import SettingsSection from "./SettingsSection";

export default async function TeamsCard() {
  const teams = await getTeamsWithRoster();

  return (
    <SettingsSection
      title="Squadre"
      hint={`${teams.length} squadre`}
      description="Le rose si consultano in Squadre. Qui si creano, si rinominano e si eliminano."
    >
      <div className="mb-4">
        {teams.map((t) => (
          <div
            key={t.id}
            className="group flex items-center gap-3 border-b border-line py-2 last:border-b-0"
          >
            <span className="flex-1 text-small font-semibold">{t.name}</span>
            <span className="font-mono text-small-dense tabular-nums text-ink-3">
              {t.totalCredits} cr
            </span>
            <span className="flex items-center gap-3 opacity-0 transition-opacity duration-fast ease-standard group-hover:opacity-100 focus-within:opacity-100">
              <TeamForm mode="edit" team={t} />
              <ReleaseAllButton
                teamId={t.id}
                teamName={t.name}
                isDisabled={t.players.length === 0}
              />
              <DeleteTeamButton teamId={t.id} teamName={t.name} disabled={t.players.length > 0} />
            </span>
          </div>
        ))}
        {teams.length === 0 && (
          <p className="text-small text-ink-3">Nessuna squadra creata.</p>
        )}
      </div>
      <TeamForm mode="create" />
    </SettingsSection>
  );
}
