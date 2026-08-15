-- AlterTable
ALTER TABLE "Player" ADD COLUMN "wishlistTier" TEXT;

-- CreateIndex
CREATE INDEX "Player_wishlistTier_idx" ON "Player"("wishlistTier");
