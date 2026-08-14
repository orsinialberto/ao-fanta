import { prisma } from "@/lib/prisma";
import type { LeagueSettings } from "@prisma/client";
import type { Role } from "@/lib/roles";

const SINGLETON_ID = "singleton";

export async function getLeagueSettings(): Promise<LeagueSettings> {
  return prisma.leagueSettings.upsert({
    where: { id: SINGLETON_ID },
    update: {},
    create: { id: SINGLETON_ID },
  });
}

export async function updateLeagueSettings(
  patch: Partial<Pick<LeagueSettings, "limitP" | "limitD" | "limitC" | "limitA" | "defaultCredits">>
): Promise<LeagueSettings> {
  await getLeagueSettings();
  return prisma.leagueSettings.update({ where: { id: SINGLETON_ID }, data: patch });
}

export function getRoleLimit(settings: LeagueSettings, role: Role): number {
  const byRole: Record<Role, number> = {
    P: settings.limitP,
    D: settings.limitD,
    C: settings.limitC,
    A: settings.limitA,
  };
  return byRole[role];
}
