import { Users, Trash2 } from "lucide-react";
import { getTeamsWithRoster } from "@/lib/teams";
import TeamForm from "@/app/teams/TeamForm";
import DeleteTeamButton from "@/app/teams/DeleteTeamButton";

export default async function TeamsCard() {
  const teams = await getTeamsWithRoster();

  return (
    <div className="flex flex-col gap-3.5 rounded-2xl border border-border bg-surface p-5 shadow-sm">
      <div className="flex items-center gap-2.5">
        <div className="flex h-9 w-9 items-center justify-center rounded-[10px] bg-teal-soft text-teal">
          <Users size={18} strokeWidth={1.8} />
        </div>
        <div>
          <h3 className="text-[14.5px] font-extrabold">Squadre</h3>
          <p className="text-xs text-ink-dim">Crea ed elimina squadre di lega</p>
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        {teams.map((t) => (
          <div key={t.id} className="flex items-center gap-2.5 rounded-lg bg-surface-2 px-2.5 py-2">
            <span className="flex-1 text-[12.5px] font-bold">{t.name}</span>
            <span className="font-mono text-[11px] text-ink-dim">{t.totalCredits} cr</span>
            <DeleteTeamButton teamId={t.id} disabled={t.players.length > 0} />
          </div>
        ))}
        {teams.length === 0 && <p className="text-xs text-ink-dim">Nessuna squadra creata.</p>}
      </div>

      <TeamForm mode="create" />
    </div>
  );
}
