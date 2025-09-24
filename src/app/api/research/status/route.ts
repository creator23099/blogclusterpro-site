import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// GET /api/research/status?jobId=kw_123
export async function GET(req: NextRequest) {
  const jobId = new URL(req.url).searchParams.get("jobId") || "";
  if (!jobId) return NextResponse.json({ error: "jobId required" }, { status: 400 });

  const job = await db.keywordsJob.findUnique({
    where: { id: jobId },
    select: {
      id: true,
      status: true,
      error: true,
      topic: true,
      location: true,
      createdAt: true,
      updatedAt: true,
      _count: { select: { suggestions: true } },
    },
  });

  if (!job) return NextResponse.json({ error: "not found" }, { status: 404 });

  // You can return READY/RUNNING/FAILED directly – your UI can key off this.
  return NextResponse.json({
    jobId: job.id,
    status: job.status,          // "RUNNING" | "READY" | "FAILED"
    suggestions: job._count.suggestions,
    error: job.error ?? null,
    topic: job.topic,
    location: job.location,
    updatedAt: job.updatedAt,
  });
}