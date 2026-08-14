import Link from "next/link";
import { Upload } from "lucide-react";
import { prisma } from "@/lib/prisma";
import WipePlayersButton from "@/app/players/WipePlayersButton";

export default async function ListoneCard() {
  const count = await prisma.player.count();

  return (
    <div className="flex flex-col gap-3.5 rounded-2xl border border-border bg-surface p-5 shadow-sm">
      <div className="flex items-center gap-2.5">
        <div className="flex h-9 w-9 items-center justify-center rounded-[10px] bg-gradient-to-br from-indigo-soft to-surface-2 text-indigo">
          <Upload size={18} strokeWidth={1.8} />
        </div>
        <div>
          <h3 className="text-[14.5px] font-extrabold">Listone</h3>
          <p className="text-xs text-ink-dim">Import ed eliminazione dei giocatori</p>
        </div>
      </div>
      <p className="text-xs text-ink-dim">File attuale: {count} giocatori.</p>
      <div className="flex flex-wrap gap-2">
        <Link
          href="/settings/import"
          className="inline-flex items-center gap-1.5 rounded-lg bg-indigo px-3.5 py-2 text-[12.5px] font-bold text-white"
        >
          <Upload size={14} strokeWidth={1.8} />
          Importa CSV/Excel
        </Link>
        <WipePlayersButton />
      </div>
    </div>
  );
}
