import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";
import { normalize } from "@/lib/normalize";
import { computeRoleStats, type RoleStats } from "@/lib/roleStats";
import type { Role } from "@/lib/roles";

export type AttendanceFilter = "25" | "50" | "75";

export const ATTENDANCE_PCT: Record<AttendanceFilter, number> = {
  "25": 0.25,
  "50": 0.5,
  "75": 0.75,
};

export type PlayerFilters = {
  role?: string[];
  serieATeam?: string;
  freeAgentOnly?: boolean;
  starterOnly?: boolean;
  wishlistTier?: string[];
  search?: string;
  presenze?: AttendanceFilter | "";
};

export async function getFilteredPlayers(filters: PlayerFilters) {
  const where: Prisma.PlayerWhereInput = {};

  if (filters.role && filters.role.length > 0) where.role = { in: filters.role };
  if (filters.serieATeam) where.serieATeam = filters.serieATeam;
  if (filters.freeAgentOnly) where.fantasyTeamId = null;
  if (filters.starterOnly) where.starter = true;
  if (filters.wishlistTier && filters.wishlistTier.length > 0) {
    where.wishlistTier = { in: filters.wishlistTier };
  }
  if (filters.presenze) {
    // Relative to the max appearances among ALL players, not just the
    // filtered set — so the threshold reflects how far the season has
    // progressed regardless of which other filters are active.
    const { _max } = await prisma.player.aggregate({ _max: { appearances: true } });
    const max = _max.appearances ?? 0;
    where.appearances = { gt: max * ATTENDANCE_PCT[filters.presenze] };
  }
  // Note: `search` is deliberately NOT added to the Prisma `where` clause.
  // SQLite's LIKE (used by Prisma's `contains`) folds ASCII case but not
  // diacritics, so "Vlahovic" would miss "Vlahović". The dataset is small
  // (~600 players, local SQLite), so we fetch the role/team/status-filtered
  // set and post-filter accent-insensitively in JS instead.

  const players = await prisma.player.findMany({
    where,
    include: { fantasyTeam: { select: { id: true, name: true } } },
    orderBy: { name: "asc" },
  });

  if (!filters.search) return players;

  const needle = normalize(filters.search);
  return players.filter((p) => normalize(p.name).includes(needle));
}

/**
 * Per-role stat scales built from the players still on the market.
 *
 * The auction panel compares the player being bought against this, so the
 * reference has to shrink as the auction empties the pool — measuring a
 * striker against the whole listone would keep flattering him after every
 * better striker has already been sold.
 *
 * The appearance threshold is measured against the max across ALL players, not
 * just the free agents: it stands for how far the season has progressed, which
 * does not change just because the good regulars have already been bought.
 */
export async function getFreeAgentRoleStats(): Promise<Record<Role, RoleStats>> {
  const [freeAgents, { _max }] = await Promise.all([
    prisma.player.findMany({
      where: { fantasyTeamId: null },
      select: {
        role: true,
        appearances: true,
        fantaMedia: true,
        mediaVoto: true,
        goals: true,
        assists: true,
      },
    }),
    prisma.player.aggregate({ _max: { appearances: true } }),
  ]);

  return computeRoleStats(freeAgents, _max.appearances ?? 0);
}

export async function getRecentAcquisitions(limit = 5) {
  return prisma.player.findMany({
    where: { fantasyTeamId: { not: null } },
    include: { fantasyTeam: { select: { id: true, name: true } } },
    orderBy: { assignedAt: "desc" },
    take: limit,
  });
}
