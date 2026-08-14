import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    await prisma.player.updateMany(
      {
        where: { fantasyTeamId: id },
        data: { fantasyTeamId: null, cost: null },
      }
    );
    return NextResponse.json({ ok: true });
  } catch (error: unknown) {
    if (error instanceof Error && "code" in error && error.code === "P2025") {
      return NextResponse.json({ error: "Team not found" }, { status: 404 });
    }
    throw error;
  }
}
