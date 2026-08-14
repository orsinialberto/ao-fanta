import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getTeamsWithRoster } from "@/lib/teams";

export async function GET() {
  const teams = await getTeamsWithRoster();
  return NextResponse.json(teams);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { name, coach, totalCredits } = body;

  if (!name || !coach || typeof totalCredits !== "number" || totalCredits < 0) {
    return NextResponse.json({ error: "Invalid team data" }, { status: 400 });
  }

  const team = await prisma.team.create({ data: { name, coach, totalCredits } });
  return NextResponse.json(team, { status: 201 });
}
