-- CreateEnum
CREATE TYPE "LogKind" AS ENUM ('EMAIL', 'ACTIVITY', 'ERROR');
-- CreateTable
CREATE TABLE "LogEntry" (
    "id" TEXT NOT NULL,
    "kind" "LogKind" NOT NULL,
    "action" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "meta" JSONB,
    "actor" TEXT,
    "level" TEXT NOT NULL DEFAULT 'info',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "LogEntry_pkey" PRIMARY KEY ("id")
);
-- CreateIndex
CREATE INDEX "LogEntry_kind_createdAt_idx" ON "LogEntry"("kind", "createdAt");
-- CreateIndex
CREATE INDEX "LogEntry_createdAt_idx" ON "LogEntry"("createdAt");
