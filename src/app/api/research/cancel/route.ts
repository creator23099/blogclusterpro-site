import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { ResearchStatus } from "@prisma/client";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// POST /api/research/cancel  { jobId: "kw_..." }
export async function POST(req: Request) {
  const { jobId } = await req.json().catch(() => ({}));
  if (!jobId) return NextResponse.json({ error: "jobId required" }, { status: 400 });

  await db.keywordsJob.update({
    where: { id: jobId },
    data: { status: ResearchStatus.FAILED, error: "cancelled" },
  });

  return NextResponse.json({ ok: true });
}