// src/app/api/research/status/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const jobId = searchParams.get("jobId");

  if (!jobId) {
    return NextResponse.json({ ok: false, error: "Missing jobId" }, { status: 400 });
  }

  const job = await prisma.keywordsJob.findUnique({
    where: { id: jobId },
    select: {
      id: true,
      status: true,
      error: true,
      createdAt: true,
      updatedAt: true,
      suggestions: {
        orderBy: { createdAt: "asc" },
        select: {
          id: true,
          keyword: true,
          score: true,
          sourceUrl: true,
          newsUrls: true,
          newsMeta: true, // array aligned with newsUrls (may be null/empty)
          createdAt: true,
        },
      },
    },
  });

  if (!job) {
    return NextResponse.json({ ok: false, error: "Job not found" }, { status: 404 });
  }

  return NextResponse.json({
    ok: true,
    jobId: job.id,
    status: job.status,
    error: job.error ?? null,
    createdAt: job.createdAt,
    updatedAt: job.updatedAt,
    suggestions: job.suggestions.map((s) => ({
      id: s.id,
      keyword: s.keyword,
      score: s.score ?? null,
      sourceUrl: s.sourceUrl ?? null,
      urls: Array.isArray(s.newsUrls) ? (s.newsUrls as string[]) : [],
      metas: Array.isArray(s.newsMeta) ? (s.newsMeta as any[]) : [],
      createdAt: s.createdAt,
    })),
  });
}