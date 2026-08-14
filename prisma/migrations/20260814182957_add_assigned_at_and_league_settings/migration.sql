-- AlterTable
ALTER TABLE "Player" ADD COLUMN "assignedAt" DATETIME;

-- CreateTable
CREATE TABLE "LeagueSettings" (
    "id" TEXT NOT NULL PRIMARY KEY DEFAULT 'singleton',
    "limitP" INTEGER NOT NULL DEFAULT 3,
    "limitD" INTEGER NOT NULL DEFAULT 8,
    "limitC" INTEGER NOT NULL DEFAULT 8,
    "limitA" INTEGER NOT NULL DEFAULT 6,
    "defaultCredits" INTEGER NOT NULL DEFAULT 500
);
