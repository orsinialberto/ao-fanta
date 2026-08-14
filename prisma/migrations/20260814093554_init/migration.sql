-- CreateTable
CREATE TABLE "Team" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "coach" TEXT NOT NULL,
    "totalCredits" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "Player" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "serieATeam" TEXT NOT NULL,
    "fantasyTeamId" TEXT,
    "cost" INTEGER,
    "starter" BOOLEAN NOT NULL DEFAULT false,
    "watchlist" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Player_fantasyTeamId_fkey" FOREIGN KEY ("fantasyTeamId") REFERENCES "Team" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "Player_fantasyTeamId_idx" ON "Player"("fantasyTeamId");

-- CreateIndex
CREATE INDEX "Player_role_idx" ON "Player"("role");
