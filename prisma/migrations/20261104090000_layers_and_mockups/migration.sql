-- DropForeignKey
ALTER TABLE "OrderItem" DROP CONSTRAINT "OrderItem_customDesignId_fkey";

-- DropIndex
DROP INDEX "OrderItem_customDesignId_key";

-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "mockups" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- AlterTable
ALTER TABLE "CustomDesign" DROP COLUMN "previewUrl",
ADD COLUMN     "layer" INTEGER NOT NULL,
ADD COLUMN     "orderItemId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "OrderItem" DROP COLUMN "customDesignId",
ADD COLUMN     "previewUrl" TEXT;

-- CreateIndex
CREATE INDEX "CustomDesign_orderItemId_idx" ON "CustomDesign"("orderItemId");

-- AddForeignKey
ALTER TABLE "CustomDesign" ADD CONSTRAINT "CustomDesign_orderItemId_fkey" FOREIGN KEY ("orderItemId") REFERENCES "OrderItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

