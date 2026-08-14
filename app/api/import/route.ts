import { NextRequest, NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { prisma } from "@/lib/prisma";

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
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows: Record<string, unknown>[] = XLSX.utils.sheet_to_json(sheet, { defval: "" });

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

    const existing = await prisma.player.findFirst({ where: { name } });
    if (existing) {
      await prisma.player.update({
        where: { id: existing.id },
        data: { role: roleRaw, serieATeam },
      });
    } else {
      await prisma.player.create({
        data: { name, role: roleRaw, serieATeam },
      });
    }
    imported++;
  }

  return NextResponse.json({ imported, skipped: errors.length, errors });
}
