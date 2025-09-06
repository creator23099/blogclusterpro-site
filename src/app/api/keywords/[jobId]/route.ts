import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";

// Never cache + ensure Node runtime
export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const revalidate = 0;

type Params = { params: { jobId: string } };

export async function GET(_req: Request, { params }: Params) {
  const { userId, sessionId } = auth();
  if (!userId || !sessionId) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401, headers: { "Cache-Control": "no-store" } }
    );
  }

  const jobId = params.jobId;
  if (!jobId || !jobId.startsWith("kw_")) {
    return NextResponse.json(
      { error: "Bad job id" },
      { status: 400, headers: { "Cache-Control": "no-store" } }
    );
  }

  try {
    const job = await db.keywordsJob.findUnique({ where: { id: jobId } });
    if (!job) {
      return NextResponse.json(
        { error: "Not found" },
        { status: 404, headers: { "Cache-Control": "no-store" } }
      );
    }
    if (job.userId !== userId) {
      return NextResponse.json(
        { error: "Forbidden" },
        { status: 403, headers: { "Cache-Control": "no-store" } }
      );
    }

    const suggestions = await db.keywordSuggestion.findMany({
      where: { jobId },
      orderBy: { createdAt: "desc" },
      take: 50,
    });

    return NextResponse.json(
      {
        job: {
          id: job.id,
          topic: job.topic,
          status: job.status,
          updatedAt: job.updatedAt,
        },
        suggestions: suggestions.map((s) => ({
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
  } catch (err: any) {
    console.error("[GET /api/keywords/[jobId]] error:", err);
    return NextResponse.json(
      { error: "Server error" },
      { status: 500, headers: { "Cache-Control": "no-store" } }
    );
  }
}