-- CreateEnum
CREATE TYPE "PrintQuality" AS ENUM ('STANDARD', 'HD', 'ULTRA_HD');

-- AlterTable
ALTER TABLE "OrderItem" ADD COLUMN     "printQuality" "PrintQuality";

-- CreateTable
CREATE TABLE "CreditPurchase" (
    "id" TEXT NOT NULL,
    "reference" TEXT NOT NULL,
    "pack" "CreditPack" NOT NULL,
    "credits" INTEGER NOT NULL,
    "priceXof" INTEGER NOT NULL,
    "paymentMethod" TEXT NOT NULL,
    "paymentStatus" "PaymentStatus" NOT NULL DEFAULT 'UNPAID',
    "paymentRef" TEXT,
    "customerId" TEXT,
    "customerName" TEXT NOT NULL,
    "customerPhone" TEXT NOT NULL,
    "customerEmail" TEXT,
    "paidAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CreditPurchase_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CreditPurchase_reference_key" ON "CreditPurchase"("reference");

-- CreateIndex
CREATE UNIQUE INDEX "CreditPurchase_paymentRef_key" ON "CreditPurchase"("paymentRef");

-- CreateIndex
CREATE INDEX "CreditPurchase_paymentStatus_idx" ON "CreditPurchase"("paymentStatus");

-- CreateIndex
CREATE INDEX "CreditPurchase_createdAt_idx" ON "CreditPurchase"("createdAt");

-- CreateIndex
CREATE INDEX "CreditPurchase_customerId_idx" ON "CreditPurchase"("customerId");

-- AddForeignKey
ALTER TABLE "CreditPurchase" ADD CONSTRAINT "CreditPurchase_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

