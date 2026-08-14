import "./globals.css";
import { manrope, jetbrainsMono } from "@/lib/fonts";
import Sidebar from "@/app/components/Sidebar";

export const metadata = {
  title: "Fantacalcio Auction Manager",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="it" className={`${manrope.variable} ${jetbrainsMono.variable}`}>
      <body className="flex bg-page text-ink font-sans">
        <Sidebar />
        <div className="flex-1 p-8">{children}</div>
      </body>
    </html>
  );
}
