import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";

export type PlayerFilters = {
  role?: string;
  serieATeam?: string;
  freeAgentOnly?: boolean;
  starterOnly?: boolean;
  watchlistOnly?: boolean;
  search?: string;
};

export async function getFilteredPlayers(filters: PlayerFilters) {
  const where: Prisma.PlayerWhereInput = {};

  if (filters.role) where.role = filters.role;
  if (filters.serieATeam) where.serieATeam = filters.serieATeam;
  if (filters.freeAgentOnly) where.fantasyTeamId = null;
  if (filters.starterOnly) where.starter = true;
  if (filters.watchlistOnly) where.watchlist = true;
  if (filters.search) where.name = { contains: filters.search };

  return prisma.player.findMany({
    where,
    include: { fantasyTeam: { select: { id: true, name: true } } },
    orderBy: { name: "asc" },
  });
}
