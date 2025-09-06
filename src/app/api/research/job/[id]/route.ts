// src/app/api/research/job/[id]/route.ts
import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const id = params.id;
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  const job = await db.keywordsJob.findUnique({
    where: { id },
    include: {
      suggestions: {
        orderBy: { createdAt: "asc" },
        select: { id: true, keyword: true, score: true, sourceUrl: true, newsUrls: true, createdAt: true },
      },
    },
  });

  if (!job) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json({
    id: job.id,
    requestId: job.requestId,
    status: job.status,         // QUEUED | RUNNING | READY | FAILED
    topic: job.topic,
    location: job.location,
    clusterId: job.clusterId,
    suggestions: job.suggestions,
    updatedAt: job.updatedAt,
  });
}