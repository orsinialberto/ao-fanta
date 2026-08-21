import Link from "next/link";
import { Upload } from "lucide-react";
import { prisma } from "@/lib/prisma";
import SettingsSection from "./SettingsSection";

export default async function ListoneCard() {
  const count = await prisma.player.count();

  return (
    <SettingsSection
      title="Listone"
      hint={`${count} giocatori`}
      description="Import da CSV o Excel, con mappatura delle colonne e anteprima prima di confermare."
    >
      <Link
        href="/settings/import"
        className="inline-flex h-8 items-center gap-2 rounded-md bg-accent px-3 text-small font-semibold text-on-accent transition-colors duration-fast ease-standard hover:bg-accent-hover"
      >
        <Upload size={14} strokeWidth={1.8} />
        Importa CSV/Excel
      </Link>
    </SettingsSection>
  );
}
