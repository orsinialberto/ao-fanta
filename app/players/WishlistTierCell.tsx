"use client";

import { TIER_ORDER, TIER_LABELS, type WishlistTier } from "@/lib/wishlist";

/**
 * Three always-visible pills rather than a cycling star: during auction prep a
 * player gets sorted into a list in one click, and clicking the pill that is
 * already active is how you take them off the wishlist entirely.
 */
export default function WishlistTierCell({
  value,
  onChange,
}: {
  value: string | null;
  onChange: (tier: WishlistTier | null) => void;
}) {
  return (
    <div className="flex gap-0.5">
      {TIER_ORDER.map((tier) => {
        const active = value === tier;
        return (
          <button
            key={tier}
            type="button"
            aria-pressed={active}
            title={`Lista ${tier} — ${TIER_LABELS[tier]}`}
            onClick={() => onChange(active ? null : tier)}
            className={`h-6 w-6 rounded-sm border font-mono text-small-dense font-semibold transition-colors duration-fast ease-standard ${
              active
                ? "border-accent bg-accent-bg text-accent"
                : "border-transparent text-ink-3 hover:border-line-strong hover:text-ink-2"
            }`}
          >
            {tier}
          </button>
        );
      })}
    </div>
  );
}
