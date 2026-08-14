import { prisma } from "@/lib/prisma";

export async function getTeamsWithRoster() {
  const teams = await prisma.team.findMany({
    include: { players: { orderBy: { role: "asc" } } },
    orderBy: { name: "asc" },
  });

  return teams.map((team) => {
    const spentCredits = team.players.reduce((sum, p) => sum + (p.cost ?? 0), 0);
    return {
      ...team,
      spentCredits,
      remainingCredits: team.totalCredits - spentCredits,
    };
  });
}
