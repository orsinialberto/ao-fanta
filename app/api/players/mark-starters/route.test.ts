import { describe, it, expect, afterAll } from "vitest";
import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { POST } from "./route";

const PREFIX = "__test_mark_starters_";

function buildRequest(names: string[]) {
  return new NextRequest(
    new Request("http://localhost/api/players/mark-starters", {
      method: "POST",
      body: JSON.stringify({ names }),
    })
  );
}

afterAll(async () => {
  await prisma.player.deleteMany({ where: { name: { startsWith: PREFIX } } });
  await prisma.$disconnect();
});

describe("POST /api/players/mark-starters", () => {
  it("marks matched players as starters and reports unmatched names", async () => {
    const p1 = await prisma.player.create({
      data: { name: `${PREFIX}Osimhen`, role: "A", serieATeam: "Napoli" },
    });
    const p2 = await prisma.player.create({
      data: { name: `${PREFIX}Vlahović`, role: "A", serieATeam: "Juventus", starter: true },
    });

    try {
      const res = await POST(buildRequest([`${PREFIX}Osimhen`, `${PREFIX}vlahovic`, `${PREFIX}Nobody`]));
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.updatedCount).toBe(2);
      expect(body.unmatchedNames).toEqual([`${PREFIX}Nobody`]);

      const rows = await prisma.player.findMany({ where: { id: { in: [p1.id, p2.id] } } });
      expect(rows.every((p) => p.starter)).toBe(true);
    } finally {
      await prisma.player.deleteMany({ where: { id: { in: [p1.id, p2.id] } } });
    }
  });

  it("does not touch players absent from the list", async () => {
    const untouched = await prisma.player.create({
      data: { name: `${PREFIX}Untouched`, role: "D", serieATeam: "Milan" },
    });

    try {
      const res = await POST(buildRequest([`${PREFIX}SomeoneElse`]));
      expect(res.status).toBe(200);

      const row = await prisma.player.findUnique({ where: { id: untouched.id } });
      expect(row?.starter).toBe(false);
    } finally {
      await prisma.player.delete({ where: { id: untouched.id } });
    }
  });

  it("returns 400 when names is not an array of strings", async () => {
    const res = await POST(buildRequest([] as never));
    const badRes = await POST(
      new NextRequest(
        new Request("http://localhost/api/players/mark-starters", {
          method: "POST",
          body: JSON.stringify({ names: "not-an-array" }),
        })
      )
    );
    expect(res.status).toBe(200);
    expect(badRes.status).toBe(400);
  });
});
