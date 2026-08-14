import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const VALID_ROLES = ["GK", "DEF", "MID", "FWD"];

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await req.json();
  const data: Record<string, unknown> = {};

  if (body.name !== undefined) data.name = body.name;
  if (body.role !== undefined) {
    if (!VALID_ROLES.includes(body.role)) {
      return NextResponse.json({ error: "Invalid role" }, { status: 400 });
    }
    data.role = body.role;
  }
  if (body.serieATeam !== undefined) data.serieATeam = body.serieATeam;
  if (body.starter !== undefined) data.starter = !!body.starter;
  if (body.watchlist !== undefined) data.watchlist = !!body.watchlist;

  if (body.fantasyTeamId !== undefined) {
    if (body.fantasyTeamId === null) {
      data.fantasyTeamId = null;
      data.cost = null;
    } else {
      if (typeof body.cost !== "number" || body.cost < 0) {
        return NextResponse.json(
          { error: "cost is required (>= 0) when assigning a player to a team" },
          { status: 400 }
        );
      }
      data.fantasyTeamId = body.fantasyTeamId;
      data.cost = body.cost;
    }
  }

  try {
    const player = await prisma.player.update({ where: { id }, data });
    return NextResponse.json(player);
  } catch (error: unknown) {
    if (error instanceof Error && "code" in error && error.code === "P2025") {
      return NextResponse.json({ error: "Player not found" }, { status: 404 });
    }
    throw error;
  }
}
