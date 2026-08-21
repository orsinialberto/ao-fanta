import { describe, it, expect } from "vitest";
import {
  computeRoleStats,
  statFraction,
  nearestRankPercentile,
  appearanceThreshold,
  MIN_APPEARANCE_SHARE,
  EMPTY_ROLE_STATS,
} from "@/lib/roleStats";

/** A full season, so `appearances` in these fixtures reads as "games played". */
const SEASON = 38;

/** Defaults to a regular starter: the appearance filter is not what's under test. */
function player(role: string, stats: Partial<Record<string, number | null>> = {}) {
  return {
    role,
    fantaMedia: null,
    mediaVoto: null,
    goals: null,
    assists: null,
    appearances: SEASON,
    ...stats,
  } as Parameters<typeof computeRoleStats>[0][number];
}

describe("computeRoleStats", () => {
  it("averages each stat within its own role", () => {
    const stats = computeRoleStats([
      player("A", { fantaMedia: 8, goals: 20 }),
      player("A", { fantaMedia: 6, goals: 10 }),
      player("D", { fantaMedia: 5, goals: 2 }),
    ], SEASON);

    expect(stats.A.fantaMedia).toEqual({ avg: 7, top: 8, count: 2 });
    expect(stats.A.goals).toEqual({ avg: 15, top: 20, count: 2 });
    expect(stats.D.fantaMedia).toEqual({ avg: 5, top: 5, count: 1 });
  });

  // A striker with one appearance and a fantamedia of 10 used to define the
  // full-bar end of the scale, squashing every real player into the left half.
  it("keeps a lone outlier out of the bar scale once the sample is large enough", () => {
    const roster = [
      player("A", { fantaMedia: 10 }),
      ...Array.from({ length: 19 }, (_, i) => player("A", { fantaMedia: 5 + i * 0.1 })),
    ];

    const stats = computeRoleStats(roster, SEASON);

    expect(stats.A.fantaMedia?.top).toBeCloseTo(6.8, 5);
    expect(stats.A.fantaMedia?.count).toBe(20);
  });

  it("skips a null stat without dropping the player's other stats", () => {
    const stats = computeRoleStats([
      player("C", { fantaMedia: 7, assists: null }),
      player("C", { fantaMedia: null, assists: 4 }),
    ], SEASON);

    expect(stats.C.fantaMedia).toEqual({ avg: 7, top: 7, count: 1 });
    expect(stats.C.assists).toEqual({ avg: 4, top: 4, count: 1 });
  });

  it("returns null for a stat no player in the role has", () => {
    const stats = computeRoleStats([player("P", { mediaVoto: 6 })], SEASON);

    expect(stats.P.mediaVoto).not.toBeNull();
    expect(stats.P.goals).toBeNull();
  });

  it("returns every role even when no player has it", () => {
    const stats = computeRoleStats([player("A", { goals: 3 })], SEASON);

    expect(stats.P).toEqual(EMPTY_ROLE_STATS);
    expect(stats.D).toEqual(EMPTY_ROLE_STATS);
    expect(stats.C).toEqual(EMPTY_ROLE_STATS);
  });

  it("ignores players whose role is not one of P/D/C/A", () => {
    const stats = computeRoleStats([player("X", { goals: 99 }), player("A", { goals: 1 })], SEASON);

    expect(stats.A.goals).toEqual({ avg: 1, top: 1, count: 1 });
  });

  it("handles an empty roster", () => {
    const stats = computeRoleStats([], SEASON);

    expect(stats.A).toEqual(EMPTY_ROLE_STATS);
  });
});

describe("computeRoleStats appearance filter", () => {
  // 50% of a 38-game season is 19, so 20 appearances is in and 19 is out.
  it("keeps only players above the appearance threshold", () => {
    const stats = computeRoleStats(
      [
        player("A", { fantaMedia: 9, appearances: 20 }),
        player("A", { fantaMedia: 3, appearances: 19 }),
      ],
      SEASON
    );

    expect(stats.A.fantaMedia).toEqual({ avg: 9, top: 9, count: 1 });
  });

  // The reason for the filter: a striker with one game and a fantamedia of 10
  // was dragging the scale up and, being a reserve, the average down.
  it("drops a one-game outlier out of the sample entirely", () => {
    const stats = computeRoleStats(
      [
        player("A", { fantaMedia: 10, appearances: 1 }),
        player("A", { fantaMedia: 6, appearances: 30 }),
        player("A", { fantaMedia: 7, appearances: 28 }),
      ],
      SEASON
    );

    expect(stats.A.fantaMedia).toEqual({ avg: 6.5, top: 7, count: 2 });
  });

  it("excludes a player whose appearances are unknown", () => {
    const stats = computeRoleStats(
      [player("C", { fantaMedia: 8, appearances: null }), player("C", { fantaMedia: 6 })],
      SEASON
    );

    expect(stats.C.fantaMedia).toEqual({ avg: 6, top: 6, count: 1 });
  });

  // Before a ball is kicked every player is on zero, so there is no sample to
  // compare against — better no notch at all than a notch built on nothing.
  it("returns no stats when the season has not started", () => {
    const stats = computeRoleStats([player("D", { fantaMedia: 6, appearances: 0 })], 0);

    expect(stats.D).toEqual(EMPTY_ROLE_STATS);
  });

  // Mid-season the threshold has to follow the games played so far, otherwise
  // in November nobody clears it and every bar loses its notch.
  it("measures the threshold against the season so far, not a full season", () => {
    const stats = computeRoleStats(
      [
        player("D", { fantaMedia: 6, appearances: 7 }),
        player("D", { fantaMedia: 4, appearances: 5 }),
      ],
      10
    );

    expect(stats.D.fantaMedia).toEqual({ avg: 6, top: 6, count: 1 });
  });
});

describe("appearanceThreshold", () => {
  it("is half of the games played so far", () => {
    expect(MIN_APPEARANCE_SHARE).toBe(0.5);
    expect(appearanceThreshold(38)).toBe(19);
    expect(appearanceThreshold(10)).toBe(5);
  });

  it("is 0 before the season starts", () => {
    expect(appearanceThreshold(0)).toBe(0);
  });
});

describe("nearestRankPercentile", () => {
  it("takes the nearest rank at or above the requested share", () => {
    const values = Array.from({ length: 20 }, (_, i) => i + 1);

    expect(nearestRankPercentile(values, 0.95)).toBe(19);
  });

  it("returns the only value of a one-element sample", () => {
    expect(nearestRankPercentile([7.5], 0.95)).toBe(7.5);
  });

  it("returns the maximum when the sample is too small to drop anything", () => {
    expect(nearestRankPercentile([3, 9], 0.95)).toBe(9);
  });

  it("does not depend on the input order", () => {
    expect(nearestRankPercentile([9, 1, 5, 3, 7], 0.95)).toBe(9);
  });

  it("returns 0 for an empty sample", () => {
    expect(nearestRankPercentile([], 0.95)).toBe(0);
  });
});

describe("statFraction", () => {
  it("scales a value against the top of its role's scale", () => {
    expect(statFraction(5, { avg: 4, top: 10, count: 3 })).toBe(0.5);
  });

  it("gives a full bar to a value sitting at the top of the scale", () => {
    expect(statFraction(10, { avg: 4, top: 10, count: 3 })).toBe(1);
  });

  // A whole role can sit at zero goals early in the season. Dividing by that
  // top would produce NaN and a bar of width "NaN%".
  it("returns 0 when the top of the scale is 0", () => {
    expect(statFraction(0, { avg: 0, top: 0, count: 5 })).toBe(0);
  });

  it("returns 0 for a missing value or a missing scale", () => {
    expect(statFraction(null, { avg: 4, top: 10, count: 3 })).toBe(0);
    expect(statFraction(5, null)).toBe(0);
  });

  // With a percentile as the top of the scale this is the normal case, not an
  // edge one: the top 5% of every role sits above it and pins the bar full.
  it("clamps a value above the top of the scale to a full bar", () => {
    expect(statFraction(14, { avg: 4, top: 10, count: 3 })).toBe(1);
  });

  it("clamps a negative value to an empty bar", () => {
    expect(statFraction(-2, { avg: 4, top: 10, count: 3 })).toBe(0);
  });
});
