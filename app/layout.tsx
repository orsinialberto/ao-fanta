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
        <main className="w-full max-w-[1240px] flex-1 px-12 pb-16 pt-10">
          {children}
        </main>
      </body>
    </html>
  );
}
