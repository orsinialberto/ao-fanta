import { prisma } from "@/lib/prisma";
import { ROLE_ORDER, type Role } from "@/lib/roles";

export async function getTeamsWithRoster() {
  const teams = await prisma.team.findMany({
    include: { players: { orderBy: { role: "asc" } } },
    orderBy: { name: "asc" },
  });

  return teams.map((team) => {
    const spentCredits = team.players.reduce((sum, p) => sum + (p.cost ?? 0), 0);
    const roleCounts = Object.fromEntries(
      ROLE_ORDER.map((role) => [role, team.players.filter((p) => p.role === role).length])
    ) as Record<Role, number>;
    return {
      ...team,
      spentCredits,
      remainingCredits: team.totalCredits - spentCredits,
      roleCounts,
    };
  });
}
