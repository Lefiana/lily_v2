-- AlterTable
ALTER TABLE "GachaPool" ADD COLUMN     "enableCloudinary" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "enableLocal" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "enableWallhaven" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "sourcePriority" JSONB DEFAULT '["local", "cloudinary", "wallhaven"]';

-- CreateTable
CREATE TABLE "PoolRarityConfig" (
    "id" TEXT NOT NULL,
    "poolId" TEXT NOT NULL,
    "rarity" "RarityTier" NOT NULL,
    "weight" INTEGER NOT NULL DEFAULT 1,
    "probability" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PoolRarityConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CloudinaryAsset" (
    "id" TEXT NOT NULL,
    "publicId" TEXT NOT NULL,
    "secureUrl" TEXT NOT NULL,
    "poolId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "rarity" "RarityTier" NOT NULL DEFAULT 'COMMON',
    "weight" INTEGER NOT NULL DEFAULT 1,
    "uploadedBy" TEXT NOT NULL,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],

    CONSTRAINT "CloudinaryAsset_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PoolRarityConfig_poolId_idx" ON "PoolRarityConfig"("poolId");

-- CreateIndex
CREATE UNIQUE INDEX "PoolRarityConfig_poolId_rarity_key" ON "PoolRarityConfig"("poolId", "rarity");

-- CreateIndex
CREATE UNIQUE INDEX "CloudinaryAsset_publicId_key" ON "CloudinaryAsset"("publicId");

-- CreateIndex
CREATE INDEX "CloudinaryAsset_poolId_rarity_idx" ON "CloudinaryAsset"("poolId", "rarity");

-- CreateIndex
CREATE INDEX "CloudinaryAsset_uploadedBy_idx" ON "CloudinaryAsset"("uploadedBy");

-- CreateIndex
CREATE INDEX "CloudinaryAsset_uploadedAt_idx" ON "CloudinaryAsset"("uploadedAt");

-- AddForeignKey
ALTER TABLE "PoolRarityConfig" ADD CONSTRAINT "PoolRarityConfig_poolId_fkey" FOREIGN KEY ("poolId") REFERENCES "GachaPool"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CloudinaryAsset" ADD CONSTRAINT "CloudinaryAsset_poolId_fkey" FOREIGN KEY ("poolId") REFERENCES "GachaPool"("id") ON DELETE CASCADE ON UPDATE CASCADE;
