import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getFilteredPlayers } from "@/lib/players";
import { isValidRole, parseRoleParam } from "@/lib/roles";
import { parseTierParam } from "@/lib/wishlist";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);

  const players = await getFilteredPlayers({
    role: parseRoleParam(searchParams.get("role")),
    serieATeam: searchParams.get("serieATeam") ?? undefined,
    freeAgentOnly: searchParams.get("freeAgentOnly") === "true",
    starterOnly: searchParams.get("starterOnly") === "true",
    watchlistOnly: searchParams.get("watchlistOnly") === "true",
    search: searchParams.get("search") ?? undefined,
    wishlistTier: parseTierParam(searchParams.get("wishlistTier")),
  });

  return NextResponse.json(players);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { name, role, serieATeam, starter } = body;

  if (!name || !isValidRole(role) || !serieATeam) {
    return NextResponse.json({ error: "Invalid player data" }, { status: 400 });
  }

  const player = await prisma.player.create({
    data: { name, role, serieATeam, starter: !!starter },
  });

  return NextResponse.json(player, { status: 201 });
}

export async function DELETE(req: NextRequest) {
  await prisma.player.deleteMany({});
  return NextResponse.json({ ok: true });
}
