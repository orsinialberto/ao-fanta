import "./globals.css";
import { manrope, jetbrainsMono } from "@/lib/fonts";
import Sidebar from "@/app/components/Sidebar";
import { prisma } from "@/lib/prisma";

export const metadata = {
  title: "Fantacalcio Auction Manager",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const [assigned, total] = await Promise.all([
    prisma.player.count({ where: { fantasyTeamId: { not: null } } }),
    prisma.player.count(),
  ]);

  return (
    <html lang="it" className={`${manrope.variable} ${jetbrainsMono.variable}`}>
      <body className="flex bg-page text-ink font-sans">
        <Sidebar assignedCount={assigned} totalCount={total} />
        <main className="w-full max-w-[1180px] flex-1 px-[34px] pb-[60px] pt-[26px]">
          {children}
        </main>
      </body>
    </html>
  );
}
