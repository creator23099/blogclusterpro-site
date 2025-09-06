// src/app/api/keywords/[jobId]/route.ts
import { NextResponse } from "next/server";
import { getAuth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type Params = { params: { jobId: string } };

export async function GET(req: Request, { params }: Params) {
  const { userId } = getAuth(req);
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: { "Cache-Control": "no-store" } });
  }

  const jobId = params.jobId;
  if (!jobId || !jobId.startsWith("kw_")) {
    return NextResponse.json({ error: "Bad job id" }, { status: 400, headers: { "Cache-Control": "no-store" } });
  }

  const job = await db.keywordsJob.findUnique({
    where: { id: jobId },
    include: {
      suggestions: { orderBy: { createdAt: "desc" }, take: 50 },
    },
  });

  if (!job) {
    return NextResponse.json({ error: "Not found" }, { status: 404, headers: { "Cache-Control": "no-store" } });
  }
  if (job.userId !== userId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403, headers: { "Cache-Control": "no-store" } });
  }

  return NextResponse.json(
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
        newsUrls: s.newsUrls ?? [],
        createdAt: s.createdAt,
      })),
    },
    { headers: { "Cache-Control": "no-store" } }
  );
}