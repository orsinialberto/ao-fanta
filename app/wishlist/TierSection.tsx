"use client";

import { useEffect, useState } from "react";
import { ChevronDown } from "lucide-react";
import type { WishlistTier } from "@/lib/wishlist";

const STORAGE_KEY = "wishlist-open-tiers";

function readOpenTiers(): Record<string, boolean> | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export default function TierSection({
  tier,
  title,
  count,
  children,
}: {
  tier: WishlistTier;
  title: string;
  count: number;
  children: React.ReactNode;
}) {
  // Starts open on the server so content is in the initial HTML; the stored
  // preference (if any) is applied after mount to avoid a hydration mismatch.
  const [open, setOpen] = useState(true);

  useEffect(() => {
    const stored = readOpenTiers();
    if (stored && tier in stored) setOpen(stored[tier]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function toggle() {
    setOpen((prev) => {
      const next = !prev;
      const stored = readOpenTiers() ?? {};
      stored[tier] = next;
      localStorage.setItem(STORAGE_KEY, JSON.stringify(stored));
      return next;
    });
  }

  return (
    <section className="mt-8">
      <button
        type="button"
        onClick={toggle}
        aria-expanded={open}
        className="flex w-full items-baseline justify-between gap-3 text-left"
      >
        <span className="flex items-center gap-2">
          <ChevronDown
            size={18}
            className={`text-ink-3 transition-transform duration-fast ease-standard ${open ? "" : "-rotate-90"}`}
          />
          <h2 className="text-h2">{title}</h2>
        </span>
        <span className="font-mono text-small-dense tabular-nums text-ink-3">
          {count} giocatori
        </span>
      </button>
      {open && <div className="mt-2">{children}</div>}
    </section>
  );
}
