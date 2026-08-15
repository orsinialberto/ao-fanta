import { describe, it, expect } from "vitest";
import { prisma } from "@/lib/prisma";
import { POST } from "./route";

const PREFIX = "__test_reset_starters_";

describe("POST /api/players/reset-starters", () => {
  it("clears starter from every player and leaves non-starters alone", async () => {
    const starter = await prisma.player.create({
      data: { name: `${PREFIX}Starter`, role: "A", serieATeam: "Napoli", starter: true },
    });
    const notStarter = await prisma.player.create({
      data: { name: `${PREFIX}NotStarter`, role: "D", serieATeam: "Milan", starter: false },
    });

    try {
      const res = await POST();
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.count).toBeGreaterThanOrEqual(1);

      const rows = await prisma.player.findMany({
        where: { id: { in: [starter.id, notStarter.id] } },
      });
      expect(rows.every((p) => p.starter === false)).toBe(true);
    } finally {
      await prisma.player.deleteMany({ where: { id: { in: [starter.id, notStarter.id] } } });
    }
  });
});
