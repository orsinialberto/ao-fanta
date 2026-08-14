import { describe, it, expect, afterAll } from "vitest";
import { prisma } from "@/lib/prisma";
import { getLeagueSettings, updateLeagueSettings, getRoleLimit } from "@/lib/leagueSettings";

afterAll(async () => {
  await prisma.leagueSettings.deleteMany({ where: { id: "singleton" } });
  await prisma.$disconnect();
});

describe("getLeagueSettings", () => {
  it("creates and returns the default singleton row on first read", async () => {
    const settings = await getLeagueSettings();
    expect(settings.limitP).toBe(3);
    expect(settings.limitD).toBe(8);
    expect(settings.limitC).toBe(8);
    expect(settings.limitA).toBe(6);
    expect(settings.defaultCredits).toBe(500);
  });

  it("returns the same row on a second read instead of recreating it", async () => {
    const first = await getLeagueSettings();
    const second = await getLeagueSettings();
    expect(second.id).toBe(first.id);
  });
});

describe("updateLeagueSettings", () => {
  it("persists a partial patch", async () => {
    await getLeagueSettings();
    const updated = await updateLeagueSettings({ limitA: 7 });
    expect(updated.limitA).toBe(7);
    expect(updated.limitP).toBe(3);
  });
});

describe("getRoleLimit", () => {
  it("maps each role to its column", async () => {
    const settings = await getLeagueSettings();
    expect(getRoleLimit(settings, "P")).toBe(settings.limitP);
    expect(getRoleLimit(settings, "A")).toBe(settings.limitA);
  });
});
