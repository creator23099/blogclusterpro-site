-- AlterTable
ALTER TABLE "public"."Post" ADD COLUMN     "captions" JSONB,
ADD COLUMN     "citations" JSONB,
ADD COLUMN     "meta" JSONB,
ADD COLUMN     "schema" JSONB;

-- AlterTable
ALTER TABLE "public"."User" ALTER COLUMN "email" DROP NOT NULL;

-- CreateTable
CREATE TABLE "public"."GenerationJob" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "topic" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'queued',
    "error" TEXT,
    "clusterId" TEXT,
    "requestId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GenerationJob_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."KeywordsJob" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'READY',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "KeywordsJob_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."KeywordSuggestion" (
    "id" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "keyword" TEXT NOT NULL,
    "score" DOUBLE PRECISION,
    "sourceUrl" TEXT,
    "newsUrls" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "KeywordSuggestion_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "GenerationJob_requestId_key" ON "public"."GenerationJob"("requestId");

-- CreateIndex
CREATE INDEX "GenerationJob_userId_status_idx" ON "public"."GenerationJob"("userId", "status");

-- CreateIndex
CREATE INDEX "KeywordsJob_userId_idx" ON "public"."KeywordsJob"("userId");

-- CreateIndex
CREATE INDEX "KeywordSuggestion_jobId_idx" ON "public"."KeywordSuggestion"("jobId");

-- CreateIndex
CREATE INDEX "Cluster_userId_idx" ON "public"."Cluster"("userId");

-- CreateIndex
CREATE INDEX "Post_clusterId_idx" ON "public"."Post"("clusterId");

-- CreateIndex
CREATE INDEX "Subscription_stripeCustomerId_idx" ON "public"."Subscription"("stripeCustomerId");

-- CreateIndex
CREATE INDEX "Usage_userId_metric_periodKey_idx" ON "public"."Usage"("userId", "metric", "periodKey");

-- CreateIndex
CREATE INDEX "User_clerkId_idx" ON "public"."User"("clerkId");

-- AddForeignKey
ALTER TABLE "public"."GenerationJob" ADD CONSTRAINT "GenerationJob_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."KeywordSuggestion" ADD CONSTRAINT "KeywordSuggestion_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "public"."KeywordsJob"("id") ON DELETE CASCADE ON UPDATE CASCADE;
