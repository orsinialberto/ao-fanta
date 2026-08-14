"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { Search } from "lucide-react";

const DEBOUNCE_MS = 250;

export default function PlayerSearchBar() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [search, setSearch] = useState(searchParams.get("search") ?? "");

  useEffect(() => {
    setSearch(searchParams.get("search") ?? "");
  }, [searchParams]);

  useEffect(() => {
    const timer = setTimeout(() => {
      const params = new URLSearchParams(searchParams.toString());
      if (search) params.set("search", search);
      else params.delete("search");
      router.replace(`${pathname}?${params.toString()}`);
    }, DEBOUNCE_MS);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  return (
    <div className="relative mb-3.5">
      <Search className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-dim/50" size={16} />
      <input
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Cerca per nome…"
        className="w-full rounded-[11px] border border-border bg-surface py-2.5 pl-10 pr-3.5 text-[13.5px] focus:border-indigo focus:outline-none"
      />
    </div>
  );
}
