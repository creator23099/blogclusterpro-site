-- AlterTable
ALTER TABLE "public"."KeywordsJob" ADD COLUMN     "uiPayload" JSONB;

-- CreateTable
CREATE TABLE "public"."ResearchArticle" (
    "id" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "title" TEXT,
    "sourceName" TEXT,
    "publishedTime" TIMESTAMP(3),
    "rawText" TEXT,
    "snippet" TEXT,
    "rank" INTEGER,
    "wordCount" INTEGER,
    "relevanceScore" DECIMAL(65,30),

    CONSTRAINT "ResearchArticle_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."ResearchTopicSuggestion" (
    "id" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "tier" TEXT NOT NULL,

    CONSTRAINT "ResearchTopicSuggestion_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ResearchArticle_jobId_idx" ON "public"."ResearchArticle"("jobId");

-- CreateIndex
CREATE INDEX "ResearchArticle_publishedTime_idx" ON "public"."ResearchArticle"("publishedTime");

-- CreateIndex
CREATE INDEX "ResearchArticle_sourceName_idx" ON "public"."ResearchArticle"("sourceName");

-- CreateIndex
CREATE UNIQUE INDEX "ResearchArticle_jobId_url_key" ON "public"."ResearchArticle"("jobId", "url");

-- CreateIndex
CREATE INDEX "ResearchTopicSuggestion_jobId_idx" ON "public"."ResearchTopicSuggestion"("jobId");

-- CreateIndex
CREATE INDEX "ResearchTopicSuggestion_label_idx" ON "public"."ResearchTopicSuggestion"("label");

-- AddForeignKey
ALTER TABLE "public"."ResearchArticle" ADD CONSTRAINT "ResearchArticle_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "public"."KeywordsJob"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ResearchTopicSuggestion" ADD CONSTRAINT "ResearchTopicSuggestion_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "public"."KeywordsJob"("id") ON DELETE CASCADE ON UPDATE CASCADE;
