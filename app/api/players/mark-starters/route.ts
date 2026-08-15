import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { matchStarters } from "@/lib/starters";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { names } = body;

  if (!Array.isArray(names) || !names.every((n) => typeof n === "string")) {
    return NextResponse.json({ error: "names deve essere un array di stringhe" }, { status: 400 });
  }

  const players = await prisma.player.findMany({ select: { id: true, name: true } });
  const { matchedIds, unmatchedNames } = matchStarters(names, players);

  await prisma.player.updateMany({
    where: { id: { in: matchedIds } },
    data: { starter: true },
  });

  return NextResponse.json({ updatedCount: matchedIds.length, unmatchedNames });
}
