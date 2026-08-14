import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const body = await req.json();
  const data: { name?: string; coach?: string; totalCredits?: number } = {};

  if (body.name !== undefined) data.name = body.name;
  if (body.coach !== undefined) data.coach = body.coach;
  if (body.totalCredits !== undefined) {
    if (typeof body.totalCredits !== "number" || body.totalCredits < 0) {
      return NextResponse.json({ error: "Invalid totalCredits" }, { status: 400 });
    }
    data.totalCredits = body.totalCredits;
  }

  const team = await prisma.team.update({ where: { id: params.id }, data });
  return NextResponse.json(team);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const playerCount = await prisma.player.count({ where: { fantasyTeamId: params.id } });

  if (playerCount > 0) {
    return NextResponse.json(
      { error: "Cannot delete team with assigned players. Unassign players first." },
      { status: 409 }
    );
  }

  await prisma.team.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
