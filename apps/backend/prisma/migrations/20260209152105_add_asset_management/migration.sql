-- CreateEnum
CREATE TYPE "AssetCondition" AS ENUM ('WORKING', 'DAMAGED', 'DECOMMISSIONED', 'UNDER_MAINTENANCE');

-- CreateEnum
CREATE TYPE "AssetStatus" AS ENUM ('AVAILABLE', 'DEPLOYED', 'RESERVED', 'IN_TRANSIT', 'UNAVAILABLE');

-- CreateEnum
CREATE TYPE "CheckoutStatus" AS ENUM ('BORROWED', 'RETURNED', 'OVERDUE', 'DAMAGED', 'LOST');

-- CreateTable
CREATE TABLE "Asset" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "sku" TEXT,
    "serialNumber" TEXT,
    "category" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "available" INTEGER NOT NULL DEFAULT 1,
    "condition" "AssetCondition" NOT NULL DEFAULT 'WORKING',
    "status" "AssetStatus" NOT NULL DEFAULT 'AVAILABLE',
    "location" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "userId" TEXT NOT NULL,

    CONSTRAINT "Asset_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AssetAttachment" (
    "id" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "filepath" TEXT NOT NULL,
    "mimetype" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "assetId" TEXT NOT NULL,

    CONSTRAINT "AssetAttachment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AssetCheckout" (
    "id" TEXT NOT NULL,
    "borrowerName" TEXT NOT NULL,
    "borrowerEmail" TEXT,
    "borrowerPhone" TEXT,
    "borrowerDepartment" TEXT,
    "borrowerId" TEXT,
    "borrowedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dueDate" TIMESTAMP(3) NOT NULL,
    "returnedAt" TIMESTAMP(3),
    "status" "CheckoutStatus" NOT NULL DEFAULT 'BORROWED',
    "damageFlag" BOOLEAN NOT NULL DEFAULT false,
    "damageNotes" TEXT,
    "returnCondition" "AssetCondition",
    "remarks" TEXT,
    "checkedOutBy" TEXT NOT NULL,
    "checkedInBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "userId" TEXT NOT NULL,

    CONSTRAINT "AssetCheckout_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AssetCheckoutItem" (
    "id" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "returnedAt" TIMESTAMP(3),
    "condition" "AssetCondition" NOT NULL DEFAULT 'WORKING',
    "notes" TEXT,
    "checkoutId" TEXT NOT NULL,
    "assetId" TEXT NOT NULL,

    CONSTRAINT "AssetCheckoutItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AssetPreset" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "userId" TEXT NOT NULL,

    CONSTRAINT "AssetPreset_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AssetPresetItem" (
    "id" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "notes" TEXT,
    "presetId" TEXT NOT NULL,
    "assetId" TEXT NOT NULL,

    CONSTRAINT "AssetPresetItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Asset_sku_key" ON "Asset"("sku");

-- CreateIndex
CREATE UNIQUE INDEX "Asset_serialNumber_key" ON "Asset"("serialNumber");

-- CreateIndex
CREATE INDEX "Asset_userId_idx" ON "Asset"("userId");

-- CreateIndex
CREATE INDEX "Asset_category_idx" ON "Asset"("category");

-- CreateIndex
CREATE INDEX "Asset_status_idx" ON "Asset"("status");

-- CreateIndex
CREATE INDEX "Asset_condition_idx" ON "Asset"("condition");

-- CreateIndex
CREATE INDEX "Asset_createdAt_idx" ON "Asset"("createdAt");

-- CreateIndex
CREATE INDEX "AssetAttachment_assetId_idx" ON "AssetAttachment"("assetId");

-- CreateIndex
CREATE INDEX "AssetCheckout_userId_idx" ON "AssetCheckout"("userId");

-- CreateIndex
CREATE INDEX "AssetCheckout_borrowerId_idx" ON "AssetCheckout"("borrowerId");

-- CreateIndex
CREATE INDEX "AssetCheckout_status_idx" ON "AssetCheckout"("status");

-- CreateIndex
CREATE INDEX "AssetCheckout_dueDate_idx" ON "AssetCheckout"("dueDate");

-- CreateIndex
CREATE INDEX "AssetCheckout_borrowedAt_idx" ON "AssetCheckout"("borrowedAt");

-- CreateIndex
CREATE INDEX "AssetCheckoutItem_checkoutId_idx" ON "AssetCheckoutItem"("checkoutId");

-- CreateIndex
CREATE INDEX "AssetCheckoutItem_assetId_idx" ON "AssetCheckoutItem"("assetId");

-- CreateIndex
CREATE UNIQUE INDEX "AssetCheckoutItem_checkoutId_assetId_key" ON "AssetCheckoutItem"("checkoutId", "assetId");

-- CreateIndex
CREATE INDEX "AssetPreset_userId_idx" ON "AssetPreset"("userId");

-- CreateIndex
CREATE INDEX "AssetPreset_isActive_idx" ON "AssetPreset"("isActive");

-- CreateIndex
CREATE INDEX "AssetPresetItem_presetId_idx" ON "AssetPresetItem"("presetId");

-- CreateIndex
CREATE INDEX "AssetPresetItem_assetId_idx" ON "AssetPresetItem"("assetId");

-- AddForeignKey
ALTER TABLE "Asset" ADD CONSTRAINT "Asset_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssetAttachment" ADD CONSTRAINT "AssetAttachment_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "Asset"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssetCheckout" ADD CONSTRAINT "AssetCheckout_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssetCheckoutItem" ADD CONSTRAINT "AssetCheckoutItem_checkoutId_fkey" FOREIGN KEY ("checkoutId") REFERENCES "AssetCheckout"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssetCheckoutItem" ADD CONSTRAINT "AssetCheckoutItem_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "Asset"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssetPreset" ADD CONSTRAINT "AssetPreset_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssetPresetItem" ADD CONSTRAINT "AssetPresetItem_presetId_fkey" FOREIGN KEY ("presetId") REFERENCES "AssetPreset"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssetPresetItem" ADD CONSTRAINT "AssetPresetItem_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "Asset"("id") ON DELETE CASCADE ON UPDATE CASCADE;
