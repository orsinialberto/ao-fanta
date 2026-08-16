import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST() {
  const { count } = await prisma.player.updateMany({
    where: { fantasyTeamId: { not: null } },
    data: { fantasyTeamId: null, cost: null },
  });

  return NextResponse.json({ count });
}
