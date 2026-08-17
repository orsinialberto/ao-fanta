import "./globals.css";
import { manrope, jetbrainsMono } from "@/lib/fonts";
import Sidebar from "@/app/components/Sidebar";
import { prisma } from "@/lib/prisma";
import { getLeagueSettings } from "@/lib/leagueSettings";

export const metadata = {
  title: "Fantacalcio Auction Manager",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const [assigned, teamCount, settings] = await Promise.all([
    prisma.player.count({ where: { fantasyTeamId: { not: null } } }),
    prisma.team.count(),
    getLeagueSettings(),
  ]);
  const rosterSize = settings.limitP + settings.limitD + settings.limitC + settings.limitA;
  const total = teamCount * rosterSize;

  return (
    <html lang="it" className={`${manrope.variable} ${jetbrainsMono.variable}`}>
      <body className="flex bg-paper text-ink font-sans">
        <Sidebar assignedCount={assigned} totalCount={total} />
        {/* min-w-0 annulla il min-width:auto implicito dei flex item. Senza,
            l'overflow-x-auto di PlayersTable non contiene niente e la tabella
            allarga la pagina. */}
        <main className="mx-auto w-full min-w-0 max-w-[1240px] flex-1 px-4 pb-16 pt-20 md:px-12 md:pt-10">
          {children}
        </main>
      </body>
    </html>
  );
}
