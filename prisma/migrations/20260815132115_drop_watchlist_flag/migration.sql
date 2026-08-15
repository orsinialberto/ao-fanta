/*
  Warnings:

  - You are about to drop the column `watchlist` on the `Player` table. All the data in the column will be lost.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Player" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "serieATeam" TEXT NOT NULL,
    "fantasyTeamId" TEXT,
    "cost" INTEGER,
    "starter" BOOLEAN NOT NULL DEFAULT false,
    "wishlistTier" TEXT,
    "assignedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Player_fantasyTeamId_fkey" FOREIGN KEY ("fantasyTeamId") REFERENCES "Team" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Player" ("assignedAt", "cost", "createdAt", "fantasyTeamId", "id", "name", "role", "serieATeam", "starter", "wishlistTier") SELECT "assignedAt", "cost", "createdAt", "fantasyTeamId", "id", "name", "role", "serieATeam", "starter", "wishlistTier" FROM "Player";
DROP TABLE "Player";
ALTER TABLE "new_Player" RENAME TO "Player";
CREATE INDEX "Player_fantasyTeamId_idx" ON "Player"("fantasyTeamId");
CREATE INDEX "Player_role_idx" ON "Player"("role");
CREATE INDEX "Player_wishlistTier_idx" ON "Player"("wishlistTier");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
