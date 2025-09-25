// src/app/api/n8n/keywords-callback/route.ts
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { ResearchStatus } from "@prisma/client";

/** Force dynamic server runtime (no static caching) */
export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const revalidate = 0;

const INGEST_SECRET = (process.env.N8N_INGEST_SECRET || "").trim();

function valid(req: Request) {
  const hdr = (req.headers.get("x-ingest-secret") || "").trim();
  if (process.env.NODE_ENV === "development") {
    console.log(
      "[INGEST] header:",
      hdr ? hdr.slice(0, 8) + "…" : "(missing)",
      "| env set?",
      Boolean(INGEST_SECRET)
    );
  }
  return Boolean(INGEST_SECRET) && hdr === INGEST_SECRET;
}

type SuggestionIn = {
  keyword?: string;
  score?: number | string | null;
  sourceUrl?: string | null;
  newsUrls?: string[] | string | null;
  // may be an array OR an object keyed by URL
  newsMeta?:
    | Array<{ summary?: string }>
    | Record<string, { summary?: string; [k: string]: any }>
    | null;
};

export async function POST(req: Request) {
  if (!INGEST_SECRET) {
    return NextResponse.json(
      { error: "Server misconfigured: N8N_INGEST_SECRET is not set" },
      { status: 500 }
    );
  }
  if (!valid(req)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Parse body
  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Bad JSON" }, { status: 400 });
  }

  const jobId: string | undefined = body?.jobId;
  const payloadUserId: string | undefined = body?.userId || body?.clerkId;
  const payloadTopic: string = (body?.topic || "").trim();
  const finalize: boolean | undefined = body?.finalize;
  const incomingStatus: string = String(body?.status || "");

  if (!jobId) return NextResponse.json({ error: "Bad payload: missing jobId" }, { status: 400 });

  // Prefer suggestions[], but keep backwards-compat with keywords[]
  const incoming: SuggestionIn[] = Array.isArray(body?.suggestions)
    ? body.suggestions
    : Array.isArray(body?.keywords)
    ? body.keywords
    : [];

  // Load (or create) the job; we need its typed topic for fallback keyword
  let job = await db.keywordsJob.findUnique({ where: { id: jobId } });

  if (!job) {
    // if job didn’t exist, create it minimally so we can attach suggestions
    job = await db.keywordsJob.create({
      data: {
        id: jobId,
        userId: payloadUserId || "unknown_user",
        topic: payloadTopic || "unspecified",
        status: ResearchStatus.RUNNING,
        startedAt: new Date(),
      },
    });
  }

  // Soft owner check
  if (payloadUserId && job.userId !== payloadUserId) {
    console.warn("[INGEST] user mismatch for job", {
      jobId,
      jobUser: job.userId,
      payloadUser: payloadUserId,
    });
  }

  const toArray = (v: any): string[] => {
    if (!v) return [];
    if (Array.isArray(v)) return v.filter(Boolean).map(String);
    if (typeof v === "string") return v.split(",").map((s) => s.trim()).filter(Boolean);
    return [];
    };

  const normalized = incoming.slice(0, 100).map((s, i) => {
    const newsUrls = toArray(s?.newsUrls);

    // Normalize newsMeta: accept array OR object keyed by URL
    let newsMetaArr: Array<{ summary?: string }> = [];
    const meta = s?.newsMeta;

    if (Array.isArray(meta)) {
      newsMetaArr = meta;
    } else if (meta && typeof meta === "object") {
      newsMetaArr = newsUrls.map((u) => {
        const m = (meta as Record<string, any>)[u];
        return m && typeof m === "object" ? { summary: m.summary } : {};
      });
    }

    // Keyword fallback: use job.topic if missing or "general-topic"
    const rawKw = (s?.keyword || "").toString().trim();
    const keyword =
      rawKw && rawKw.toLowerCase() !== "general-topic"
        ? rawKw
        : (payloadTopic || job.topic || "general-topic");

    // Score normalization
    const score =
      typeof s?.score === "number"
        ? s.score
        : typeof s?.score === "string"
        ? Number(s.score) || null
        : null;

    // Choose a source if missing
    const sourceUrl = s?.sourceUrl || newsUrls[0] || null;

    return {
      jobId,
      keyword,
      score,
      sourceUrl,
      newsUrls,
      newsMeta: newsMetaArr, // array aligned to newsUrls
      order: i,
    };
  });

  // Decide new status
  const status: ResearchStatus =
    incomingStatus.toUpperCase() === "FAILED"
      ? ResearchStatus.FAILED
      : finalize || incomingStatus.toUpperCase() === "READY"
      ? ResearchStatus.READY
      : ResearchStatus.RUNNING;

  // Save everything
  await db.$transaction(async (tx) => {
    // Optionally refresh topic on the job if it was empty and payload gives us one
    const topicUpdate =
      !job?.topic && payloadTopic ? { topic: payloadTopic } : {};

    await tx.keywordsJob.update({
      where: { id: jobId },
      data: {
        ...topicUpdate,
        status,
        error: status === ResearchStatus.FAILED ? (body?.error?.toString()?.slice(0, 500) || "failed") : null,
        completedAt: status === ResearchStatus.READY ? new Date() : null,
        updatedAt: new Date(),
      },
    });

    await tx.keywordSuggestion.deleteMany({ where: { jobId } });
    if (normalized.length) {
      await tx.keywordSuggestion.createMany({
        data: normalized.map((n) => ({
          jobId: n.jobId,
          keyword: n.keyword,
          score: n.score,
          sourceUrl: n.sourceUrl,
          newsUrls: n.newsUrls,
          newsMeta: n.newsMeta, // JSON
        })),
      });
    }
  });

  console.log("[n8n keywords callback] saved", {
    jobId,
    owner: job.userId,
    suggestions: normalized.length,
    status,
  });

  return NextResponse.json(
    { ok: true, saved: normalized.length, status },
    { headers: { "Cache-Control": "no-store" } }
  );
}

/** Nice-to-have: handle CORS preflight gracefully if ever needed */
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "Content-Type, x-ingest-secret",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Cache-Control": "no-store",
    },
  });
}