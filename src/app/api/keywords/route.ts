// src/app/api/keywords/route.ts
import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { ResearchStatus } from "@prisma/client";
import { db } from "@/lib/db";

/** ---------- helpers ---------- */
function getBaseUrl(req: Request) {
  const proto = req.headers.get("x-forwarded-proto");
  const host = req.headers.get("x-forwarded-host");
  if (proto && host) return `${proto}://${host}`;
  return process.env.NEXT_PUBLIC_SITE_URL!;
}

function normCountry(raw?: string | null) {
  if (!raw) return "US";
  const v = String(raw).trim();
  if (!v) return "US";
  if (v.length === 2) return v.toUpperCase();
  if (/united\s*states/i.test(v)) return "US";
  return v.toUpperCase();
}

function normRegion(raw?: string | null) {
  if (!raw) return "ALL";
  const v = String(raw).trim();
  return v ? v.toUpperCase() : "ALL";
}

/**
 * POST /api/keywords
 * Accepts either:
 *   { topic, country, region, seedKeywords?, maxResults?, jobId? }
 * OR legacy:
 *   { niche, location, seedKeywords?, maxResults?, jobId? }
 */
export async function POST(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = (await req.json()) ?? {};

    // Back-compat mapping
    const topic: string = (body.topic ?? body.niche ?? "").toString().trim();
    const country: string = normCountry(body.country ?? body.location);
    const region: string = normRegion(body.region);
    const seedKeywords: string[] | undefined = Array.isArray(body.seedKeywords)
      ? body.seedKeywords
      : undefined;
    const maxResults: number | undefined =
      typeof body.maxResults === "number" ? body.maxResults : undefined;
    const incomingJobId: string | undefined = typeof body.jobId === "string" ? body.jobId : undefined;

    if (!topic) {
      return NextResponse.json({ error: "Missing topic (or niche)" }, { status: 400 });
    }

    const jobId = incomingJobId || `kw_${randomUUID()}`;

    // Create/update the job row immediately so UI can reflect it
    await db.keywordsJob.upsert({
      where: { id: jobId },
      update: {
        userId,
        topic,
        country,
        region,
        // keep your existing "location" field if present in schema:
        location: body.location ?? "GLOBAL",
        status: ResearchStatus.QUEUED,
        startedAt: new Date(),
      },
      create: {
        id: jobId,
        userId,
        topic,
        country,
        region,
        location: body.location ?? "GLOBAL",
        status: ResearchStatus.QUEUED,
        startedAt: new Date(),
      },
    });

    const callbackUrl = `${getBaseUrl(req)}/api/n8n/keywords-callback`;

    // Payload your n8n flow expects—now with normalized topic/country/region
    const payload = {
      userId,
      jobId,
      topic,                 // ✅ real user topic (not "general-topic")
      country,               // e.g. "US"
      region,                // e.g. "ALL" or "CA"
      location: body.location ?? "GLOBAL", // keep sending if your flow uses it
      seedKeywords,
      maxResults,
      callbackUrl,
    };

    const n8nUrl = process.env.N8N_KEYWORDS_URL!;
    const res = await fetch(n8nUrl, {
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

    // Mark RUNNING while n8n does its thing
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
    const { userId } = await auth();
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