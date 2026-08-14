import "./globals.css";
import Link from "next/link";
import { manrope, jetbrainsMono } from "@/lib/fonts";

export const metadata = {
  title: "Fantacalcio Auction Manager",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="it" className={`${manrope.variable} ${jetbrainsMono.variable}`}>
      <body className="bg-page text-ink font-sans">
        <nav className="border-b border-gray-200 px-6 py-3 flex gap-6">
          <Link href="/players" className="font-medium hover:underline">
            Giocatori
          </Link>
          <Link href="/players/import" className="font-medium hover:underline">
            Import
          </Link>
          <Link href="/teams" className="font-medium hover:underline">
            Squadre
          </Link>
          <Link href="/watchlist" className="font-medium hover:underline">
            Watchlist
          </Link>
        </nav>
        <div className="p-6">{children}</div>
      </body>
    </html>
  );
}
