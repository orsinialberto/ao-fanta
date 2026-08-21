import "./globals.css";
import { manrope, jetbrainsMono } from "@/lib/fonts";
import Sidebar from "@/app/components/Sidebar";
import ThemeToggle from "@/app/components/ThemeToggle";
import { prisma } from "@/lib/prisma";
import { getLeagueSettings } from "@/lib/leagueSettings";

export const metadata = {
  title: "Fantacalcio Auction Manager",
};

// Allinea la barra del browser al tema, così su telefono non resta una
// striscia chiara sopra una pagina scura.
export const viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#eaecf6" },
    { media: "(prefers-color-scheme: dark)", color: "#101216" },
  ],
};

/**
 * Gira prima del primo paint e prima del bundle, quindi non può importare da
 * `lib/theme.ts`: la chiave e i valori sono duplicati a mano. Senza questo
 * script, a ogni reload si vede un lampo del tema sbagliato.
 */
const THEME_BOOTSTRAP = `
(function () {
  try {
    var raw = localStorage.getItem("ao-fanta-theme");
    var choice = raw === "light" || raw === "dark" ? raw : "system";
    var dark = choice === "dark" ||
      (choice === "system" && matchMedia("(prefers-color-scheme: dark)").matches);
    document.documentElement.setAttribute("data-theme", dark ? "dark" : "light");
  } catch (e) {}
})();
`;

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const [assigned, teamCount, settings] = await Promise.all([
    prisma.player.count({ where: { fantasyTeamId: { not: null } } }),
    prisma.team.count(),
    getLeagueSettings(),
  ]);
  const rosterSize = settings.limitP + settings.limitD + settings.limitC + settings.limitA;
  const total = teamCount * rosterSize;

  return (
    // suppressHydrationWarning perché lo script sopra scrive data-theme
    // sull'elemento prima che React idrati.
    <html
      lang="it"
      className={`${manrope.variable} ${jetbrainsMono.variable}`}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_BOOTSTRAP }} />
      </head>
      <body className="flex bg-paper text-ink font-sans">
        <Sidebar assignedCount={assigned} totalCount={total} />
        <ThemeToggle />
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
