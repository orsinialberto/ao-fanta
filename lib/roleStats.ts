import { ROLE_ORDER, isValidRole, type Role } from "@/lib/roles";

/** The four Fantacalcio figures shown while assigning a player. */
export const STAT_KEYS = ["fantaMedia", "mediaVoto", "goals", "assists"] as const;
export type StatKey = (typeof STAT_KEYS)[number];

export const STAT_LABELS: Record<StatKey, string> = {
  fantaMedia: "Fantamedia",
  mediaVoto: "Media voto",
  goals: "Gol",
  assists: "Assist",
};

/** Averages are decimals for both the votes and the counting stats. */
export const STAT_DECIMALS: Record<StatKey, { value: number; average: number }> = {
  fantaMedia: { value: 2, average: 2 },
  mediaVoto: { value: 2, average: 2 },
  goals: { value: 0, average: 1 },
  assists: { value: 0, average: 1 },
};

/**
 * One stat summarised across a role: `avg` is the reference notch, `top` sets
 * the full-bar end of the scale, `count` is how many players it came from.
 */
export type StatScale = { avg: number; top: number; count: number };

export type RoleStats = Record<StatKey, StatScale | null>;

export const EMPTY_ROLE_STATS: RoleStats = {
  fantaMedia: null,
  mediaVoto: null,
  goals: null,
  assists: null,
};

/**
 * The share of a role that sits at or below the full-bar end of the scale.
 *
 * The raw maximum is not usable here: a striker with a single appearance and a
 * fantamedia of 10 would own the scale and squash every real player into the
 * left half of the bar. The top 5% simply pin their bars full instead.
 */
export const SCALE_PERCENTILE = 0.95;

/**
 * How much of the season played so far a player must have to count toward his
 * role's reference figures.
 *
 * Without it the sample is mostly reserves: they drag the average down, so
 * every regular starter reads as "above average" and the notch stops meaning
 * anything. The comparison people actually make during an auction is against
 * players who play.
 */
export const MIN_APPEARANCE_SHARE = 0.5;

/**
 * Minimum appearances to enter the sample, given the most games any player has
 * managed so far. Tying it to that rather than to a 38-game season keeps the
 * bar honest in November, when nobody has played 19 games yet.
 */
export function appearanceThreshold(maxAppearances: number): number {
  return Math.max(0, maxAppearances) * MIN_APPEARANCE_SHARE;
}

export type StatSource = { role: string; appearances: number | null } & Record<
  StatKey,
  number | null
>;

/**
 * Per-role averages and maxima for the four stats.
 *
 * The auction panel feeds this the *free agents only*, so the reference moves
 * with the market: once the best strikers are gone the bar for the next one is
 * measured against what is still buyable, which is the comparison that matters
 * mid-auction. Of those, only players past `MIN_APPEARANCE_SHARE` of the season
 * count. Each stat is then averaged over the players that actually have it —
 * a player missing a fantamedia still counts toward the goals average.
 */
export function computeRoleStats(
  players: StatSource[],
  maxAppearances: number
): Record<Role, RoleStats> {
  const samples = {} as Record<Role, Record<StatKey, number[]>>;
  const minAppearances = appearanceThreshold(maxAppearances);

  for (const role of ROLE_ORDER) {
    samples[role] = { fantaMedia: [], mediaVoto: [], goals: [], assists: [] };
  }

  for (const player of players) {
    if (!isValidRole(player.role)) continue;
    if (player.appearances === null || player.appearances <= minAppearances) continue;
    for (const key of STAT_KEYS) {
      const value = player[key];
      if (value === null || value === undefined || Number.isNaN(value)) continue;
      samples[player.role][key].push(value);
    }
  }

  return Object.fromEntries(
    ROLE_ORDER.map((role) => [
      role,
      Object.fromEntries(
        STAT_KEYS.map((key) => {
          const values = samples[role][key];
          if (values.length === 0) return [key, null];
          const total = values.reduce((sum, v) => sum + v, 0);
          return [
            key,
            {
              avg: total / values.length,
              top: nearestRankPercentile(values, SCALE_PERCENTILE),
              count: values.length,
            },
          ];
        })
      ) as RoleStats,
    ])
  ) as Record<Role, RoleStats>;
}

/**
 * Nearest-rank percentile: the smallest value that at least `share` of the
 * sample is at or below. No interpolation, so the result is always a figure
 * some player actually posted.
 */
export function nearestRankPercentile(values: number[], share: number): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const rank = Math.ceil(share * sorted.length);
  const index = Math.min(sorted.length - 1, Math.max(0, rank - 1));
  return sorted[index];
}

/** Where a value sits on its role's scale, as 0-1 — safe to use as a CSS width. */
export function statFraction(value: number | null, scale: StatScale | null): number {
  if (value === null || scale === null || scale.top <= 0) return 0;
  return Math.min(1, Math.max(0, value / scale.top));
}
