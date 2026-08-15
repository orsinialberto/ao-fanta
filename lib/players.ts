import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";
import { normalize } from "@/lib/normalize";

export type PlayerFilters = {
  role?: string[];
  serieATeam?: string;
  freeAgentOnly?: boolean;
  starterOnly?: boolean;
  watchlistOnly?: boolean;
  wishlistTier?: string[];
  search?: string;
};

export async function getFilteredPlayers(filters: PlayerFilters) {
  const where: Prisma.PlayerWhereInput = {};

  if (filters.role && filters.role.length > 0) where.role = { in: filters.role };
  if (filters.serieATeam) where.serieATeam = filters.serieATeam;
  if (filters.freeAgentOnly) where.fantasyTeamId = null;
  if (filters.starterOnly) where.starter = true;
  if (filters.watchlistOnly) where.watchlist = true;
  if (filters.wishlistTier && filters.wishlistTier.length > 0) {
    where.wishlistTier = { in: filters.wishlistTier };
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

export async function getRecentAcquisitions(limit = 5) {
  return prisma.player.findMany({
    where: { fantasyTeamId: { not: null } },
    include: { fantasyTeam: { select: { id: true, name: true } } },
    orderBy: { assignedAt: "desc" },
    take: limit,
  });
}
