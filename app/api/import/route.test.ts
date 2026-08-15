import { describe, it, expect, beforeAll, afterAll } from "vitest";
import * as XLSX from "xlsx";
import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { POST } from "./route";

const mapping = { name: "Nome", role: "Ruolo", serieATeam: "Squadra" };

/** Builds a real .xlsx File the same way a browser upload would produce. */
function buildFile(rows: string[][]): File {
  const sheet = XLSX.utils.aoa_to_sheet(rows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, sheet, "Sheet1");
  const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" }) as Buffer;
  const bytes = Uint8Array.from(buffer);
  return new File([bytes], "import.xlsx", {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
}

function buildRequest(file: File, mode: "preview" | "commit") {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("mapping", JSON.stringify(mapping));
  formData.append("mode", mode);
  return new NextRequest(
    new Request("http://localhost/api/import", { method: "POST", body: formData })
  );
}

const SEED_NAME = "__test_import_route_seed__";
const NEW_NAME = "__test_import_route_new__";

afterAll(async () => {
  await prisma.player.deleteMany({ where: { name: { startsWith: "__test_import_route_" } } });
  await prisma.$disconnect();
});

describe("POST /api/import", () => {
  it("mode=preview never writes to the DB", async () => {
    const seed = await prisma.player.create({
      data: { name: SEED_NAME, role: "A", serieATeam: "Napoli" },
    });

    try {
      const file = buildFile([
        ["Nome", "Ruolo", "Squadra"],
        [NEW_NAME, "ATT", "Roma"],
      ]);
      const res = await POST(buildRequest(file, "preview"));
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.toCreate).toEqual([NEW_NAME]);
      expect(body.toUpdate).toEqual([]);
      // Other test suites may be seeding/cleaning up their own players
      // concurrently against the same test DB, so assert containment
      // rather than the full toDelete list (matches the .toContain
      // convention used elsewhere in this repo's DB-backed tests).
      expect(body.toDelete).toContain(SEED_NAME);

      // The real assertion for this finding: preview must not touch the DB.
      // Scoped to our own rows rather than a global count, for the same
      // concurrency reason as above.
      const rows = await prisma.player.findMany({
        where: { name: { in: [SEED_NAME, NEW_NAME] } },
      });
      expect(rows.map((p) => p.name).sort()).toEqual([SEED_NAME]);
    } finally {
      await prisma.player.delete({ where: { id: seed.id } });
    }
  });

  it("returns 400 and deletes nothing when the file has zero valid rows", async () => {
    const seed = await prisma.player.create({
      data: { name: SEED_NAME, role: "A", serieATeam: "Napoli" },
    });

    try {
      // Missing name on the only data row -> parseAndValidateRows drops it,
      // so valid.length === 0. Uses mode=commit so the test actually
      // exercises the hazard the finding calls out: without the early
      // return, computeReconcile would see zero valid rows and mark every
      // existing player (including SEED_NAME) for deletion.
      const file = buildFile([
        ["Nome", "Ruolo", "Squadra"],
        ["", "ATT", "Roma"],
      ]);
      const res = await POST(buildRequest(file, "commit"));
      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.error).toBeTruthy();

      const stillThere = await prisma.player.findUnique({ where: { id: seed.id } });
      expect(stillThere).not.toBeNull();
    } finally {
      await prisma.player.delete({ where: { id: seed.id } });
    }
  });
});
