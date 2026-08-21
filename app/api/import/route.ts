import { NextRequest, NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { prisma } from "@/lib/prisma";
import { sheetToRows } from "@/lib/xlsxImport";
import {
  parseAndValidateRows,
  computeReconcile,
  parseAndValidateStatsRows,
  computeStatsReconcile,
  type StatsMapping,
} from "@/lib/importReconcile";

export async function POST(req: NextRequest) {
  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  const mappingRaw = formData.get("mapping") as string | null;
  const mode = (formData.get("mode") as string | null) ?? "preview";
  const type = (formData.get("type") as string | null) ?? "listone";

  if (!file || !mappingRaw) {
    return NextResponse.json({ error: "file and mapping are required" }, { status: 400 });
  }
  if (mode !== "preview" && mode !== "commit") {
    return NextResponse.json({ error: "mode must be 'preview' or 'commit'" }, { status: 400 });
  }
  if (type !== "listone" && type !== "stats") {
    return NextResponse.json({ error: "type must be 'listone' or 'stats'" }, { status: 400 });
  }

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
  const rows = sheetToRows(sheet);

  if (type === "stats") {
    return handleStatsImport(rows, JSON.parse(mappingRaw) as StatsMapping, mode);
  }

  const mapping = JSON.parse(mappingRaw) as {
    name: string;
    role: string;
    serieATeam: string;
  };

  const { valid, errors } = parseAndValidateRows(rows, mapping);

  if (valid.length === 0) {
    return NextResponse.json(
      { error: "Nessuna riga valida trovata nel file", skipped: errors.length, errors },
      { status: 400 }
    );
  }

  // Upsert/delete-by-name must be accent-insensitive too (SQLite LIKE/equality
  // folds ASCII case but not diacritics) — matching happens in JS via
  // computeReconcile rather than a DB query per row.
  const existingPlayers = await prisma.player.findMany({
    select: { id: true, name: true, role: true, serieATeam: true },
  });

  const { toCreate, toUpdate, toDeleteIds, toDeleteNames } = computeReconcile(
    valid,
    existingPlayers
  );

  if (mode === "preview") {
    return NextResponse.json({
      toCreate: toCreate.map((p) => p.name),
      toUpdate: toUpdate.map((p) => p.name),
      toDelete: toDeleteNames,
      skipped: errors.length,
      errors,
    });
  }

  await prisma.$transaction([
    ...(toCreate.length > 0 ? [prisma.player.createMany({ data: toCreate })] : []),
    ...toUpdate.map((p) =>
      prisma.player.update({ where: { id: p.id }, data: { role: p.role, serieATeam: p.serieATeam } })
    ),
    ...(toDeleteIds.length > 0
      ? [prisma.player.deleteMany({ where: { id: { in: toDeleteIds } } })]
      : []),
  ]);

  return NextResponse.json({
    created: toCreate.length,
    updated: toUpdate.length,
    deleted: toDeleteIds.length,
    skipped: errors.length,
    errors,
  });
}

async function handleStatsImport(
  rows: Record<string, unknown>[],
  mapping: StatsMapping,
  mode: "preview" | "commit"
) {
  const { valid, errors } = parseAndValidateStatsRows(rows, mapping);

  if (valid.length === 0) {
    return NextResponse.json(
      { error: "Nessuna riga valida trovata nel file", skipped: errors.length, errors },
      { status: 400 }
    );
  }

  const existingPlayers = await prisma.player.findMany({ select: { id: true, name: true } });
  const { toUpdate, notFoundNames } = computeStatsReconcile(valid, existingPlayers);

  if (mode === "preview") {
    return NextResponse.json({
      toUpdate: toUpdate.map((p) => p.name),
      notFound: notFoundNames,
      skipped: errors.length,
      errors,
    });
  }

  await prisma.$transaction(
    toUpdate.map((p) =>
      prisma.player.update({
        where: { id: p.id },
        data: {
          mediaVoto: p.mediaVoto,
          fantaMedia: p.fantaMedia,
          goals: p.goals,
          assists: p.assists,
          appearances: p.appearances,
        },
      })
    )
  );

  return NextResponse.json({
    updated: toUpdate.length,
    notFound: notFoundNames.length,
    skipped: errors.length,
    errors,
  });
}
