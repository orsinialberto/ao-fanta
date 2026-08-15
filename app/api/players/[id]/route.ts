import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isValidRole, ROLE_LABELS, type Role } from "@/lib/roles";
import { getLeagueSettings, getRoleLimit } from "@/lib/leagueSettings";
import { evaluateRoleLimit } from "@/lib/roleLimit";
import { isValidTier } from "@/lib/wishlist";

async function checkRoleLimit(
  playerTeamId: string | null,
  newRole: string,
  playerId: string
): Promise<{ ok: boolean; error?: string }> {
  if (!playerTeamId || !isValidRole(newRole)) return { ok: true };

  const count = await prisma.player.count({
    where: {
      fantasyTeamId: playerTeamId,
      role: newRole,
      id: { not: playerId },
    },
  });

  const settings = await getLeagueSettings();
  const limit = getRoleLimit(settings, newRole as Role);
  return evaluateRoleLimit(count, limit, ROLE_LABELS[newRole as Role]);
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await req.json();
  const data: Record<string, unknown> = {};

  if (body.name !== undefined) data.name = body.name;
  if (body.role !== undefined) {
    if (!isValidRole(body.role)) {
      return NextResponse.json({ error: "Invalid role" }, { status: 400 });
    }

    // If this is a pure role change (no fantasyTeamId change) on an assigned player,
    // check if the new role would exceed the team's limits
    if (body.fantasyTeamId === undefined) {
      const player = await prisma.player.findUnique({
        where: { id },
        select: { fantasyTeamId: true },
      });
      if (player?.fantasyTeamId) {
        const check = await checkRoleLimit(player.fantasyTeamId, body.role, id);
        if (!check.ok) {
          return NextResponse.json({ error: check.error }, { status: 400 });
        }
      }
    }

    data.role = body.role;
  }
  if (body.serieATeam !== undefined) data.serieATeam = body.serieATeam;
  if (body.starter !== undefined) data.starter = !!body.starter;
  if (body.watchlist !== undefined) data.watchlist = !!body.watchlist;
  if (body.wishlistTier !== undefined) {
    // null clears the tier; anything outside A/B/C is a client bug, not a value
    // to silently coerce.
    if (body.wishlistTier !== null && !isValidTier(body.wishlistTier)) {
      return NextResponse.json({ error: "Invalid wishlist tier" }, { status: 400 });
    }
    data.wishlistTier = body.wishlistTier;
  }

  if (body.fantasyTeamId !== undefined) {
    if (body.fantasyTeamId === null) {
      data.fantasyTeamId = null;
      data.cost = null;
      data.assignedAt = null;
    } else {
      if (typeof body.cost !== "number" || body.cost < 0) {
        return NextResponse.json(
          { error: "cost is required (>= 0) when assigning a player to a team" },
          { status: 400 }
        );
      }

      const player = await prisma.player.findUnique({ where: { id }, select: { role: true } });
      if (!player) {
        return NextResponse.json({ error: "Player not found" }, { status: 404 });
      }
      const role = isValidRole(body.role) ? body.role : player.role;
      if (isValidRole(role)) {
        const roleCount = await prisma.player.count({
          where: { fantasyTeamId: body.fantasyTeamId, role, id: { not: id } },
        });
        const settings = await getLeagueSettings();
        const limit = getRoleLimit(settings, role);
        const check = evaluateRoleLimit(roleCount, limit, ROLE_LABELS[role]);
        if (!check.ok) {
          return NextResponse.json({ error: check.error }, { status: 400 });
        }
      }

      data.fantasyTeamId = body.fantasyTeamId;
      data.cost = body.cost;
      data.assignedAt = new Date();
    }
  }

  try {
    const player = await prisma.player.update({ where: { id }, data });
    return NextResponse.json(player);
  } catch (error: unknown) {
    if (error instanceof Error && "code" in error && error.code === "P2025") {
      return NextResponse.json({ error: "Player not found" }, { status: 404 });
    }
    if (error instanceof Error && "code" in error && error.code === "P2003") {
      return NextResponse.json({ error: "Squadra non valida" }, { status: 400 });
    }
    throw error;
  }
}
