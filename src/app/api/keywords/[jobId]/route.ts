// src/app/api/keywords/[jobId]/route.ts
import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic"; // ensure no caching in app routes

export async function GET(
  _req: Request,
  { params }: { params: { jobId: string } }
) {
  const { userId } = auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const job = await db.keywordsJob.findUnique({
    where: { id: params.jobId },
    include: { suggestions: { orderBy: { createdAt: "desc" }, take: 200 } },
  });

  if (!job || job.userId !== userId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const resp = NextResponse.json(
    {
      job: {
        id: job.id,
        topic: job.topic,
        status: job.status,
        updatedAt: job.updatedAt,
      },
      suggestions: job.suggestions.map((s) => ({
        id: s.id,
        keyword: s.keyword,
        score: s.score,
        sourceUrl: s.sourceUrl,
        newsUrls: Array.isArray(s.newsUrls) ? (s.newsUrls as string[]) : [],
        createdAt: s.createdAt,
      })),
    },
    { status: 200 }
  );

  // be extra explicit about caching for edge/CDN layers
  resp.headers.set("Cache-Control", "no-store, no-cache, must-revalidate");
  return resp;
}