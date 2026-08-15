import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { prisma } from "@/lib/prisma";
import { getRecentAcquisitions, getFilteredPlayers } from "@/lib/players";

let teamId: string;
const playerIds: string[] = [];

beforeAll(async () => {
  const team = await prisma.team.create({
    data: { name: "__test_team__", coach: "test", totalCredits: 100 },
  });
  teamId = team.id;

  const older = await prisma.player.create({
    data: { name: "__older__", role: "A", serieATeam: "Test", fantasyTeamId: teamId, cost: 10, assignedAt: new Date("2026-01-01") },
  });
  const newer = await prisma.player.create({
    data: { name: "__newer__", role: "D", serieATeam: "Test", fantasyTeamId: teamId, cost: 5, assignedAt: new Date("2026-06-01") },
  });
  const unassigned = await prisma.player.create({
    data: { name: "__unassigned__", role: "C", serieATeam: "Test" },
  });
  const tierA = await prisma.player.create({
    data: { name: "__tier_a__", role: "A", serieATeam: "Test", wishlistTier: "A" },
  });
  const tierC = await prisma.player.create({
    data: { name: "__tier_c__", role: "A", serieATeam: "Test", wishlistTier: "C" },
  });
  playerIds.push(older.id, newer.id, unassigned.id, tierA.id, tierC.id);
});

afterAll(async () => {
  await prisma.player.deleteMany({ where: { id: { in: playerIds } } });
  await prisma.team.delete({ where: { id: teamId } });
  await prisma.$disconnect();
});

describe("getRecentAcquisitions", () => {
  it("returns only assigned players, newest first", async () => {
    const recent = await getRecentAcquisitions(10);
    const names = recent.map((p) => p.name);
    expect(names.indexOf("__newer__")).toBeLessThan(names.indexOf("__older__"));
    expect(names).not.toContain("__unassigned__");
  });

  it("respects the limit", async () => {
    const recent = await getRecentAcquisitions(1);
    expect(recent.length).toBe(1);
    expect(recent[0].name).toBe("__newer__");
  });
});

describe("getFilteredPlayers, wishlistTier", () => {
  it("returns only players in the requested tiers", async () => {
    const players = await getFilteredPlayers({ wishlistTier: ["A"] });
    const names = players.map((p) => p.name);
    expect(names).toContain("__tier_a__");
    expect(names).not.toContain("__tier_c__");
    expect(names).not.toContain("__unassigned__");
  });

  it("accepts several tiers at once", async () => {
    const players = await getFilteredPlayers({ wishlistTier: ["A", "C"] });
    const names = players.map((p) => p.name);
    expect(names).toContain("__tier_a__");
    expect(names).toContain("__tier_c__");
  });

  it("ignores an empty tier list rather than returning nothing", async () => {
    const players = await getFilteredPlayers({ wishlistTier: [] });
    expect(players.map((p) => p.name)).toContain("__unassigned__");
  });
});
