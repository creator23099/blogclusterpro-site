-- CreateEnum
CREATE TYPE "public"."ArticleType" AS ENUM ('PILLAR', 'SUPPORTING');

-- CreateEnum
CREATE TYPE "public"."OutlineStatus" AS ENUM ('NONE', 'READY', 'FAILED');

-- CreateEnum
CREATE TYPE "public"."DraftStatus" AS ENUM ('NONE', 'READY', 'FAILED');

-- AlterTable
ALTER TABLE "public"."Post" ADD COLUMN     "draftStatus" "public"."DraftStatus" NOT NULL DEFAULT 'NONE',
ADD COLUMN     "outline" JSONB,
ADD COLUMN     "outlineMetadata" JSONB,
ADD COLUMN     "outlineStatus" "public"."OutlineStatus" NOT NULL DEFAULT 'NONE',
ADD COLUMN     "parentId" TEXT,
ADD COLUMN     "parentSlug" TEXT,
ADD COLUMN     "type" "public"."ArticleType" NOT NULL DEFAULT 'SUPPORTING';

-- CreateIndex
CREATE INDEX "Post_type_idx" ON "public"."Post"("type");

-- CreateIndex
CREATE INDEX "Post_parentId_idx" ON "public"."Post"("parentId");

-- CreateIndex
CREATE INDEX "Post_parentSlug_idx" ON "public"."Post"("parentSlug");

-- AddForeignKey
ALTER TABLE "public"."Post" ADD CONSTRAINT "Post_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "public"."Post"("id") ON DELETE SET NULL ON UPDATE CASCADE;
