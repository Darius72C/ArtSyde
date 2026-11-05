-- CreateTable
CREATE TABLE "HeroCard" (
    "slot" INTEGER NOT NULL,
    "imageUrl" TEXT NOT NULL,
    "productId" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "HeroCard_pkey" PRIMARY KEY ("slot")
);
-- AddForeignKey
ALTER TABLE "HeroCard" ADD CONSTRAINT "HeroCard_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE SET NULL ON UPDATE CASCADE;
