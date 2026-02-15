-- CreateEnum
CREATE TYPE "HabitDifficulty" AS ENUM ('BEGINNER', 'INTERMEDIATE', 'ADVANCED', 'EXPERT');

-- CreateEnum
CREATE TYPE "GachaPoolType" AS ENUM ('STANDARD', 'PREMIUM');

-- CreateEnum
CREATE TYPE "RarityTier" AS ENUM ('COMMON', 'UNCOMMON', 'RARE', 'EPIC', 'LEGENDARY');

-- CreateEnum
CREATE TYPE "TransactionType" AS ENUM ('QUEST_REWARD', 'HABIT_REWARD', 'LEVEL_UP_BONUS', 'GACHA_PULL', 'ADMIN_GRANT', 'ADMIN_DEDUCT');

-- AlterTable
ALTER TABLE "user" ADD COLUMN     "competence" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "currency" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "exp" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "lastDailyReset" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "level" INTEGER NOT NULL DEFAULT 1;

-- CreateTable
CREATE TABLE "DailyQuest" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "completed" BOOLEAN NOT NULL DEFAULT false,
    "completedAt" TIMESTAMP(3),
    "currencyReward" INTEGER NOT NULL DEFAULT 250,
    "expReward" INTEGER NOT NULL DEFAULT 50,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "questNumber" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DailyQuest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HabitTemplate" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "category" TEXT NOT NULL,
    "difficulty" "HabitDifficulty" NOT NULL DEFAULT 'BEGINNER',
    "minLevel" INTEGER NOT NULL DEFAULT 1,
    "weight" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "HabitTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HabitEntry" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "templateId" TEXT,
    "customTitle" TEXT,
    "completed" BOOLEAN NOT NULL DEFAULT false,
    "completedAt" TIMESTAMP(3),
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "currencyReward" INTEGER NOT NULL DEFAULT 100,
    "expReward" INTEGER NOT NULL DEFAULT 50,
    "competenceGain" INTEGER NOT NULL DEFAULT 5,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HabitEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GachaPool" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "type" "GachaPoolType" NOT NULL,
    "cost" INTEGER NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isAdminOnly" BOOLEAN NOT NULL DEFAULT false,
    "wallhavenTags" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GachaPool_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GachaItem" (
    "id" TEXT NOT NULL,
    "poolId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "imageUrl" TEXT NOT NULL,
    "rarity" "RarityTier" NOT NULL,
    "dropRate" DOUBLE PRECISION NOT NULL DEFAULT 0.1,
    "storageType" TEXT,
    "storagePath" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GachaItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GachaPull" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "poolId" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "cost" INTEGER NOT NULL,
    "pulledAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GachaPull_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserCollection" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "obtainedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "pullCount" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "UserCollection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CurrencyTransaction" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "type" "TransactionType" NOT NULL,
    "description" TEXT,
    "balanceBefore" INTEGER NOT NULL,
    "balanceAfter" INTEGER NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CurrencyTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DailyQuest_userId_date_idx" ON "DailyQuest"("userId", "date");

-- CreateIndex
CREATE INDEX "DailyQuest_userId_completed_idx" ON "DailyQuest"("userId", "completed");

-- CreateIndex
CREATE UNIQUE INDEX "DailyQuest_userId_date_questNumber_key" ON "DailyQuest"("userId", "date", "questNumber");

-- CreateIndex
CREATE INDEX "HabitTemplate_difficulty_minLevel_idx" ON "HabitTemplate"("difficulty", "minLevel");

-- CreateIndex
CREATE INDEX "HabitEntry_userId_date_idx" ON "HabitEntry"("userId", "date");

-- CreateIndex
CREATE INDEX "HabitEntry_userId_completed_idx" ON "HabitEntry"("userId", "completed");

-- CreateIndex
CREATE INDEX "GachaPool_isActive_idx" ON "GachaPool"("isActive");

-- CreateIndex
CREATE INDEX "GachaPool_isAdminOnly_idx" ON "GachaPool"("isAdminOnly");

-- CreateIndex
CREATE INDEX "GachaItem_poolId_rarity_idx" ON "GachaItem"("poolId", "rarity");

-- CreateIndex
CREATE INDEX "GachaPull_userId_pulledAt_idx" ON "GachaPull"("userId", "pulledAt");

-- CreateIndex
CREATE INDEX "GachaPull_poolId_pulledAt_idx" ON "GachaPull"("poolId", "pulledAt");

-- CreateIndex
CREATE INDEX "UserCollection_userId_obtainedAt_idx" ON "UserCollection"("userId", "obtainedAt");

-- CreateIndex
CREATE UNIQUE INDEX "UserCollection_userId_itemId_key" ON "UserCollection"("userId", "itemId");

-- CreateIndex
CREATE INDEX "CurrencyTransaction_userId_createdAt_idx" ON "CurrencyTransaction"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "CurrencyTransaction_userId_type_idx" ON "CurrencyTransaction"("userId", "type");

-- AddForeignKey
ALTER TABLE "DailyQuest" ADD CONSTRAINT "DailyQuest_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HabitEntry" ADD CONSTRAINT "HabitEntry_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HabitEntry" ADD CONSTRAINT "HabitEntry_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "HabitTemplate"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GachaItem" ADD CONSTRAINT "GachaItem_poolId_fkey" FOREIGN KEY ("poolId") REFERENCES "GachaPool"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GachaPull" ADD CONSTRAINT "GachaPull_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GachaPull" ADD CONSTRAINT "GachaPull_poolId_fkey" FOREIGN KEY ("poolId") REFERENCES "GachaPool"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GachaPull" ADD CONSTRAINT "GachaPull_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "GachaItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserCollection" ADD CONSTRAINT "UserCollection_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserCollection" ADD CONSTRAINT "UserCollection_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "GachaItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CurrencyTransaction" ADD CONSTRAINT "CurrencyTransaction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
