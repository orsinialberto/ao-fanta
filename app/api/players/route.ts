import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getFilteredPlayers } from "@/lib/players";

const VALID_ROLES = ["P", "D", "C", "A"];

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);

  const players = await getFilteredPlayers({
    role: searchParams.get("role") ?? undefined,
    serieATeam: searchParams.get("serieATeam") ?? undefined,
    freeAgentOnly: searchParams.get("freeAgentOnly") === "true",
    starterOnly: searchParams.get("starterOnly") === "true",
    watchlistOnly: searchParams.get("watchlistOnly") === "true",
    search: searchParams.get("search") ?? undefined,
  });

  return NextResponse.json(players);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { name, role, serieATeam, starter } = body;

  if (!name || !VALID_ROLES.includes(role) || !serieATeam) {
    return NextResponse.json({ error: "Invalid player data" }, { status: 400 });
  }

  const player = await prisma.player.create({
    data: { name, role, serieATeam, starter: !!starter },
  });

  return NextResponse.json(player, { status: 201 });
}
