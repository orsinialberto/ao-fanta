"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Gavel, List, Users, Star, Settings } from "lucide-react";
import { spendPercent } from "@/lib/credits";

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
      className={`flex items-center gap-3 rounded-md px-2 py-2 text-small transition-colors duration-fast ease-standard ${
        active
          ? "bg-surface font-semibold text-ink ring-1 ring-inset ring-line"
          : "font-medium text-ink-2 hover:bg-surface-sunk hover:text-ink"
      }`}
    >
      <Icon size={15} strokeWidth={1.7} />
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
  const pct = spendPercent(assignedCount, totalCount);

  return (
    <aside className="sticky top-0 flex h-screen w-[220px] flex-col gap-6 border-r border-line bg-paper p-4">
      <div className="flex items-center gap-2 px-2">
        <div className="h-5 w-5 shrink-0 rounded-sm bg-accent" />
        <span className="text-h3">ao-fanta</span>
      </div>

      <nav className="flex flex-col gap-px">
        {PRIMARY_LINKS.map((l) => (
          <NavLink key={l.href} {...l} />
        ))}
      </nav>

      <div className="flex flex-col gap-2 px-2">
        <span className="text-label uppercase text-ink-3">Stato asta</span>
        <div className="h-[3px] overflow-hidden rounded-full bg-line">
          <div
            className="h-full rounded-full bg-accent transition-[width] duration-500 ease-standard"
            style={{ width: `${pct}%` }}
          />
        </div>
        <span className="text-small-dense text-ink-3">
          <span className="font-mono font-medium tabular-nums text-ink">{assignedCount}</span> di{" "}
          {totalCount} assegnati
        </span>
      </div>

      <nav className="mt-auto flex flex-col gap-px">
        {CONFIG_LINKS.map((l) => (
          <NavLink key={l.href} {...l} />
        ))}
      </nav>
    </aside>
  );
}
