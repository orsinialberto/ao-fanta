"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Gavel, List, Users, Star, Settings } from "lucide-react";

const PRIMARY_LINKS = [
  { href: "/", label: "Asta", icon: Gavel },
  { href: "/players", label: "Listone", icon: List },
  { href: "/teams", label: "Squadre", icon: Users },
  { href: "/watchlist", label: "Wishlist", icon: Star },
];

const CONFIG_LINKS = [{ href: "/settings", label: "Impostazioni", icon: Settings }];

function NavLink({ href, label, icon: Icon }: { href: string; label: string; icon: typeof Gavel }) {
  const pathname = usePathname();
  const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
  return (
    <Link
      href={href}
      className={`flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm font-semibold ${
        active ? "bg-indigo-soft text-indigo" : "text-ink-dim hover:bg-surface-2 hover:text-ink"
      }`}
    >
      <Icon size={17} strokeWidth={1.8} />
      {label}
    </Link>
  );
}

export default function Sidebar({
  assignedCount,
  totalCount,
}: {
  assignedCount: number;
  totalCount: number;
}) {
  const pct = totalCount > 0 ? Math.round((assignedCount / totalCount) * 100) : 0;

  return (
    <aside className="sticky top-0 flex h-screen w-[238px] flex-col gap-6 border-r border-border bg-surface p-5">
      <div className="flex items-center gap-2.5 px-1">
        <div className="h-7 w-7 flex-shrink-0 rounded-[9px] bg-gradient-to-br from-indigo to-[#8B7FF0]" />
        <span className="text-[14.5px] font-extrabold">ao-fanta</span>
      </div>

      <nav className="flex flex-col gap-0.5">
        <div className="mb-2 px-2 text-[10.5px] font-bold uppercase tracking-wide text-ink-dim/70">
          Principale
        </div>
        {PRIMARY_LINKS.map((l) => (
          <NavLink key={l.href} {...l} />
        ))}
      </nav>

      <nav className="flex flex-col gap-0.5">
        <div className="mb-2 px-2 text-[10.5px] font-bold uppercase tracking-wide text-ink-dim/70">
          Configurazione
        </div>
        {CONFIG_LINKS.map((l) => (
          <NavLink key={l.href} {...l} />
        ))}
      </nav>

      <div className="mt-auto rounded-2xl bg-gradient-to-br from-coral-soft to-surface-2 p-4">
        <div className="mb-2 text-[11px] font-bold">Stato asta</div>
        <div className="mb-2 h-1.5 overflow-hidden rounded-full bg-black/10">
          <div className="h-full rounded-full bg-coral" style={{ width: `${pct}%` }} />
        </div>
        <div className="text-[11px] text-ink-dim">
          <span className="font-mono font-bold text-ink">{assignedCount}</span> / {totalCount} giocatori assegnati
        </div>
      </div>
    </aside>
  );
}
