// src/app/api/research/route.ts
import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { ResearchStatus } from "@prisma/client";

export async function POST(req: Request) {
  try {
    const { userId } = auth(); // App Router: no await
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const topic = (body?.topic ?? body?.niche ?? "").trim();
    if (!topic) {
      return NextResponse.json({ error: "Topic is required" }, { status: 400 });
    }

    const jobId = `kw_${Date.now()}`;
    await db.keywordsJob.create({
      data: {
        id: jobId,
        userId,
        topic,
        country: body?.country ?? "US",
        region: body?.region ?? "ALL",
        location: body?.location ?? "US:ALL",
        status: ResearchStatus.RUNNING,
      },
    });

    // Kick off n8n
    const resp = await fetch(process.env.N8N_KEYWORDS_URL!, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-INGEST-SECRET": process.env.N8N_INGEST_SECRET!,
      },
      body: JSON.stringify({
        jobId,
        userId,
        topic,
        country: body?.country ?? "US",
        region: body?.region ?? "ALL",
        location: body?.location ?? "US:ALL",
      }),
      cache: "no-store",
    });

    if (!resp.ok) {
      await db.keywordsJob.update({
        where: { id: jobId },
        data: { status: ResearchStatus.FAILED, error: `n8n webhook failed: ${resp.status}` },
      });
      return NextResponse.json({ error: "Failed to start research", jobId }, { status: 502 });
    }

    return NextResponse.json({ ok: true, jobId, userId });
  } catch (err: any) {
    console.error("[research] Route error:", err);
    return NextResponse.json({ error: err?.message ?? "Internal server error" }, { status: 500 });
  }
}