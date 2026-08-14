import { NextRequest, NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { prisma } from "@/lib/prisma";
import { normalize } from "@/lib/normalize";

const VALID_ROLES = ["GK", "DEF", "MID", "FWD"];

export async function POST(req: NextRequest) {
  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  const mappingRaw = formData.get("mapping") as string | null;

  if (!file || !mappingRaw) {
    return NextResponse.json({ error: "file and mapping are required" }, { status: 400 });
  }

  const mapping = JSON.parse(mappingRaw) as {
    name: string;
    role: string;
    serieATeam: string;
  };

  const buffer = Buffer.from(await file.arrayBuffer());
  const workbook = XLSX.read(buffer, { type: "buffer" });
  const sheetName = workbook.SheetNames[0];

  if (!sheetName) {
    return NextResponse.json(
      { error: "Il file non contiene fogli leggibili" },
      { status: 400 }
    );
  }

  const sheet = workbook.Sheets[sheetName];
  const rows: Record<string, unknown>[] = XLSX.utils.sheet_to_json(sheet, { defval: "" });

  // Upsert-by-name must be accent-insensitive too (SQLite LIKE/equality
  // folds ASCII case but not diacritics), otherwise re-importing with a
  // differently-accented name creates a duplicate instead of updating.
  // Dataset is small (~600 players), so load all names once and compare
  // normalized in JS rather than an exact-match findFirst per row.
  const existingPlayers = await prisma.player.findMany({
    select: { id: true, name: true },
  });
  const existingByNormalizedName = new Map(
    existingPlayers.map((p) => [normalize(p.name), p.id])
  );

  let imported = 0;
  const errors: string[] = [];

  for (const [index, row] of rows.entries()) {
    const name = String(row[mapping.name] ?? "").trim();
    const roleRaw = String(row[mapping.role] ?? "").trim().toUpperCase();
    const serieATeam = String(row[mapping.serieATeam] ?? "").trim();
    const rowNumber = index + 2; // header row is row 1

    if (!name) {
      errors.push(`Riga ${rowNumber}: nome mancante`);
      continue;
    }
    if (!VALID_ROLES.includes(roleRaw)) {
      errors.push(`Riga ${rowNumber}: ruolo non valido "${roleRaw}"`);
      continue;
    }
    if (!serieATeam) {
      errors.push(`Riga ${rowNumber}: squadra Serie A mancante`);
      continue;
    }

    const existingId = existingByNormalizedName.get(normalize(name));
    if (existingId) {
      await prisma.player.update({
        where: { id: existingId },
        data: { role: roleRaw, serieATeam },
      });
    } else {
      const created = await prisma.player.create({
        data: { name, role: roleRaw, serieATeam },
      });
      existingByNormalizedName.set(normalize(name), created.id);
    }
    imported++;
  }

  return NextResponse.json({ imported, skipped: errors.length, errors });
}
