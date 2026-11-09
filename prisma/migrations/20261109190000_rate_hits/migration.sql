-- CreateTable
CREATE TABLE "RateHit" (
    "id" TEXT NOT NULL,
    "bucket" TEXT NOT NULL,
    "at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RateHit_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "RateHit_bucket_at_idx" ON "RateHit"("bucket", "at");
