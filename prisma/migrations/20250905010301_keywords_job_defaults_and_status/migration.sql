/*
  Warnings:

  - The `status` column on the `KeywordsJob` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - A unique constraint covering the columns `[requestId]` on the table `KeywordsJob` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateEnum
CREATE TYPE "public"."ResearchStatus" AS ENUM ('QUEUED', 'RUNNING', 'READY', 'FAILED');

-- DropIndex
DROP INDEX "public"."KeywordsJob_userId_idx";

-- AlterTable
ALTER TABLE "public"."KeywordsJob" ADD COLUMN     "clusterId" TEXT,
ADD COLUMN     "completedAt" TIMESTAMP(3),
ADD COLUMN     "country" TEXT NOT NULL DEFAULT 'US',
ADD COLUMN     "error" TEXT,
ADD COLUMN     "location" TEXT NOT NULL DEFAULT 'GLOBAL',
ADD COLUMN     "region" TEXT NOT NULL DEFAULT 'ALL',
ADD COLUMN     "requestId" TEXT,
ADD COLUMN     "startedAt" TIMESTAMP(3),
ADD COLUMN     "topic" TEXT NOT NULL DEFAULT 'unspecified',
DROP COLUMN "status",
ADD COLUMN     "status" "public"."ResearchStatus" NOT NULL DEFAULT 'QUEUED';

-- CreateIndex
CREATE UNIQUE INDEX "KeywordsJob_requestId_key" ON "public"."KeywordsJob"("requestId");

-- CreateIndex
CREATE INDEX "KeywordsJob_userId_createdAt_idx" ON "public"."KeywordsJob"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "KeywordsJob_status_createdAt_idx" ON "public"."KeywordsJob"("status", "createdAt");
