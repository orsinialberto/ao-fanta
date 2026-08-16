"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Gavel, List, Users, Star, Settings, Menu, X } from "lucide-react";
import { spendPercent } from "@/lib/credits";

const PRIMARY_LINKS = [
  { href: "/", label: "Asta", icon: Gavel },
  { href: "/players", label: "Listone", icon: List },
  { href: "/teams", label: "Squadre", icon: Users },
  { href: "/wishlist", label: "Wishlist", icon: Star },
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
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const pct = spendPercent(assignedCount, totalCount);

  // Il drawer è una superficie di navigazione: essere atterrati su una rotta
  // nuova è il segnale che ha finito il suo lavoro e deve togliersi di mezzo.
  useEffect(() => setOpen(false), [pathname]);

  useEffect(() => {
    if (!open) return;

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", onKeyDown);

    // Senza questo la pagina dietro al drawer scorre sotto il dito.
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  return (
    <>
      <header className="fixed inset-x-0 top-0 z-30 flex h-14 items-center gap-3 border-b border-line bg-paper px-4 md:hidden">
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Apri menu"
          aria-expanded={open}
          aria-controls="sidebar-nav"
          className="-ml-2 flex h-9 w-9 items-center justify-center rounded-md text-ink-2 transition-colors duration-fast ease-standard hover:bg-surface-sunk hover:text-ink"
        >
          <Menu size={18} strokeWidth={1.7} />
        </button>
        <div className="h-5 w-5 shrink-0 rounded-sm bg-accent" />
        <span className="text-h3">ao-fanta</span>
      </header>

      {open && (
        <div
          onClick={() => setOpen(false)}
          aria-hidden="true"
          className="fixed inset-0 z-40 bg-ink/40 md:hidden"
        />
      )}

      {/* invisible da chiuso toglie i link dall'ordine di tabulazione senza
          smontarli, così la transform può animare. md:visible lo riporta su
          desktop, dove il drawer non esiste come concetto. */}
      <aside
        id="sidebar-nav"
        className={`fixed left-0 top-0 z-50 flex h-screen w-[220px] flex-col gap-6 border-r border-line bg-paper p-4 transition-transform duration-base ease-standard md:sticky md:z-auto md:visible md:translate-x-0 ${
          open ? "visible translate-x-0" : "invisible -translate-x-full"
        }`}
      >
        <div className="flex items-center gap-2 px-2">
          <div className="h-5 w-5 shrink-0 rounded-sm bg-accent" />
          <span className="text-h3">ao-fanta</span>
          <button
            type="button"
            onClick={() => setOpen(false)}
            aria-label="Chiudi menu"
            className="-mr-1 ml-auto flex h-8 w-8 items-center justify-center rounded-md text-ink-3 transition-colors duration-fast ease-standard hover:bg-surface-sunk hover:text-ink md:hidden"
          >
            <X size={16} strokeWidth={1.7} />
          </button>
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
    </>
  );
}
