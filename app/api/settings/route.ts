// app/api/settings/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getLeagueSettings, updateLeagueSettings } from "@/lib/leagueSettings";

const FIELDS = ["limitP", "limitD", "limitC", "limitA", "defaultCredits"] as const;

export async function GET() {
  const settings = await getLeagueSettings();
  return NextResponse.json(settings);
}

export async function PATCH(req: NextRequest) {
  const body = await req.json();
  const patch: Record<string, number> = {};

  for (const field of FIELDS) {
    if (body[field] === undefined) continue;
    if (typeof body[field] !== "number" || body[field] < 0 || !Number.isInteger(body[field])) {
      return NextResponse.json({ error: `${field} deve essere un intero >= 0` }, { status: 400 });
    }
    patch[field] = body[field];
  }

  const settings = await updateLeagueSettings(patch);
  return NextResponse.json(settings);
}
