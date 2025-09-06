// src/app/api/keywords/route.ts
import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { ResearchStatus } from "@prisma/client";
import { db } from "@/lib/db";

/**
 * Helper: build base URL for callback (works in dev/prod/tunnels)
 */
function getBaseUrl(req: Request) {
  const proto = req.headers.get("x-forwarded-proto");
  const host = req.headers.get("x-forwarded-host");
  if (proto && host) return `${proto}://${host}`;
  return process.env.NEXT_PUBLIC_SITE_URL!;
}

/**
 * POST /api/keywords
 * - Auth required
 * - Creates/updates a KeywordsJob row immediately so the UI can show it
 * - Sends the job to n8n (which later calls /api/n8n/keywords-callback)
 * - Returns { jobId } for the client to poll/navigate
 */
export async function POST(req: Request) {
  try {
    const { userId } = auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = (await req.json()) ?? {};
    const {
      niche,
      location,
      seedKeywords,
      maxResults,
      jobId: incomingJobId,
    }: {
      niche?: string;
      location?: string;
      seedKeywords?: string[];
      maxResults?: number;
      jobId?: string;
    } = body;

    if (!niche) {
      return NextResponse.json({ error: "Missing niche" }, { status: 400 });
    }

    const jobId = incomingJobId || `kw_${randomUUID()}`;

    // Upsert job row so UI can show it right away
    await db.keywordsJob.upsert({
      where: { id: jobId },
      update: {
        userId,
        topic: niche,
        country: "US",
        region: "ALL",
        location: location ?? "GLOBAL",
        status: ResearchStatus.QUEUED,
        startedAt: new Date(),
      },
      create: {
        id: jobId,
        userId,
        topic: niche,
        country: "US",
        region: "ALL",
        location: location ?? "GLOBAL",
        status: ResearchStatus.QUEUED,
        startedAt: new Date(),
      },
    });

    const callbackUrl = `${getBaseUrl(req)}/api/n8n/keywords-callback`;
    const payload = {
      userId,
      jobId,
      topic: niche,
      location: location ?? "GLOBAL",
      seedKeywords,
      maxResults,
      callbackUrl,
    };

    const res = await fetch(process.env.N8N_KEYWORDS_URL!, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-INGEST-SECRET": process.env.N8N_INGEST_SECRET ?? "",
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      await db.keywordsJob.update({
        where: { id: jobId },
        data: {
          status: ResearchStatus.FAILED,
          error: `n8n ${res.status}: ${text.slice(0, 300)}`,
        },
      });
      return NextResponse.json(
        { error: "n8n request failed", details: text.slice(0, 500), jobId },
        { status: 502 }
      );
    }

    // mark as RUNNING so dashboards look alive while n8n works
    await db.keywordsJob.update({
      where: { id: jobId },
      data: { status: ResearchStatus.RUNNING },
    });

    return NextResponse.json({ ok: true, queued: true, jobId });
  } catch (err) {
    console.error("[/api/keywords POST] error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

/**
 * GET /api/keywords?jobId=kw_xxx
 * - If jobId provided, returns that job (must belong to the user) + suggestions[]
 * - Otherwise, returns the user's recent jobs with a few most recent suggestions each
 */
export async function GET(req: Request) {
  try {
    const { userId } = auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const jobId = searchParams.get("jobId") ?? undefined;

    if (jobId) {
      const job = await db.keywordsJob.findUnique({
        where: { id: jobId },
        include: { suggestions: { orderBy: { createdAt: "desc" } } },
      });
      if (!job || job.userId !== userId) {
        return NextResponse.json({ error: "Not found" }, { status: 404 });
      }
      return NextResponse.json({ job });
    }

    const jobs = await db.keywordsJob.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 10,
      include: { suggestions: { orderBy: { createdAt: "desc" }, take: 5 } },
    });

    return NextResponse.json({ jobs });
  } catch (err) {
    console.error("[/api/keywords GET] error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}