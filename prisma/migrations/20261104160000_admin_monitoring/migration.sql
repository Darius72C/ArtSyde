-- CreateEnum
CREATE TYPE "ProductTag" AS ENUM ('NOUVEAU', 'BEST_SELLER', 'PROMO');

-- CreateEnum
CREATE TYPE "CreditReason" AS ENUM ('SIGNUP_BONUS', 'PURCHASE', 'IMAGE_UPLOAD', 'DESIGN_SAVE', 'HD_PREVIEW', 'REFUND', 'ADJUSTMENT');

-- CreateEnum
CREATE TYPE "CreditPack" AS ENUM ('DECOUVERTE', 'CREATEUR', 'STUDIO');

-- CreateEnum
CREATE TYPE "DeliveryMethod" AS ENUM ('STANDARD', 'EXPRESS', 'RETRAIT');

-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "art" TEXT,
ADD COLUMN     "oldPriceXof" INTEGER,
ADD COLUMN     "tag" "ProductTag",
ALTER COLUMN "description" SET DEFAULT '',
ALTER COLUMN "designUrl" DROP NOT NULL;

-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "customerId" TEXT,
ADD COLUMN     "delivery" "DeliveryMethod" NOT NULL DEFAULT 'STANDARD';

-- AlterTable
ALTER TABLE "OrderItem" ADD COLUMN     "savedDesignId" TEXT;

-- CreateTable
CREATE TABLE "ColorStock" (
    "id" TEXT NOT NULL,
    "colorHex" TEXT NOT NULL,
    "colorName" TEXT NOT NULL,
    "size" "Size" NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 0,
    "lowAt" INTEGER NOT NULL DEFAULT 5,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ColorStock_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Customer" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "email" TEXT,
    "city" TEXT,
    "address" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Customer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CreditEntry" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "reason" "CreditReason" NOT NULL,
    "pack" "CreditPack",
    "priceXof" INTEGER,
    "paymentRef" TEXT,
    "designId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CreditEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SavedDesign" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "teeColor" TEXT NOT NULL,
    "front" JSONB,
    "back" JSONB,
    "previewUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SavedDesign_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ColorStock_colorHex_size_key" ON "ColorStock"("colorHex", "size");

-- CreateIndex
CREATE UNIQUE INDEX "Customer_phone_key" ON "Customer"("phone");

-- CreateIndex
CREATE UNIQUE INDEX "Customer_email_key" ON "Customer"("email");

-- CreateIndex
CREATE UNIQUE INDEX "CreditEntry_paymentRef_key" ON "CreditEntry"("paymentRef");

-- CreateIndex
CREATE INDEX "CreditEntry_customerId_idx" ON "CreditEntry"("customerId");

-- CreateIndex
CREATE INDEX "CreditEntry_createdAt_idx" ON "CreditEntry"("createdAt");

-- CreateIndex
CREATE INDEX "SavedDesign_customerId_idx" ON "SavedDesign"("customerId");

-- CreateIndex
CREATE INDEX "Order_customerId_idx" ON "Order"("customerId");

-- AddForeignKey
ALTER TABLE "CreditEntry" ADD CONSTRAINT "CreditEntry_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CreditEntry" ADD CONSTRAINT "CreditEntry_designId_fkey" FOREIGN KEY ("designId") REFERENCES "SavedDesign"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SavedDesign" ADD CONSTRAINT "SavedDesign_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_savedDesignId_fkey" FOREIGN KEY ("savedDesignId") REFERENCES "SavedDesign"("id") ON DELETE SET NULL ON UPDATE CASCADE;

