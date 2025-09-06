// src/app/api/n8n/keywords-callback/route.ts
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { ResearchStatus } from "@prisma/client";

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
  return INGEST_SECRET && hdr === INGEST_SECRET;
}

type IncomingKeyword = {
  keyword: string;
  score?: number | null;
  sourceUrl?: string | null;
  newsUrls?: string[] | null;
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

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Bad JSON" }, { status: 400 });
  }

  const { userId: clerkId, jobId, keywords, finalize, status } = body || {};
  if (!clerkId || !jobId || !Array.isArray(keywords)) {
    return NextResponse.json({ error: "Bad payload" }, { status: 400 });
  }

  const list: IncomingKeyword[] = keywords.slice(0, 100);
  const normalized = list.map((k) => ({
    keyword: String(k?.keyword ?? "").trim(),
    score: typeof k?.score === "number" ? k.score : null,
    sourceUrl: k?.sourceUrl ?? null,
    newsUrls: Array.isArray(k?.newsUrls) ? k.newsUrls : [],
  }));

  const result = await db.$transaction(async (tx) => {
    // Ensure job exists. IMPORTANT: don't modify userId on update.
    await tx.keywordsJob.upsert({
      where: { id: jobId },
      update: { updatedAt: new Date() },          // <-- no userId here
      create: { id: jobId, userId: clerkId },     // <-- set owner only on create
    });

    // Optional: warn if existing owner doesn't match incoming payload
    const existing = await tx.keywordsJob.findUnique({ where: { id: jobId } });
    if (existing && existing.userId !== clerkId) {
      console.warn("[INGEST] user mismatch for job", {
        jobId,
        jobUser: existing.userId,
        payloadUser: clerkId,
      });
      // If you want to be strict, you could throw here to reject the callback.
    }

    // Replace all suggestions (assuming n8n sends full set)
    await tx.keywordSuggestion.deleteMany({ where: { jobId } });
    if (normalized.length) {
      await tx.keywordSuggestion.createMany({
        data: normalized.map((k) => ({
          jobId,
          keyword: k.keyword,
          score: k.score,
          sourceUrl: k.sourceUrl,
          newsUrls: k.newsUrls ?? [],
        })),
      });
    }

    // Decide new status
    const newStatus =
      status === "FAILED"
        ? ResearchStatus.FAILED
        : finalize || status === "READY"
        ? ResearchStatus.READY
        : ResearchStatus.RUNNING;

    // Build update payload safely
    const updateData: any = {
      status: newStatus,
      error:
        newStatus === ResearchStatus.FAILED
          ? body.error?.toString()?.slice(0, 500)
          : null,
      updatedAt: new Date(),
    };

    if (newStatus === ResearchStatus.READY) {
      updateData.completedAt = new Date();
    }

    await tx.keywordsJob.update({
      where: { id: jobId },
      data: updateData,
    });

    const count = await tx.keywordSuggestion.count({ where: { jobId } });
    return { count, status: newStatus };
  });

  console.log("[n8n keywords callback] saved", {
    jobId,
    clerkId,
    suggestions: result.count,
    status: result.status,
  });

  return NextResponse.json(
    { ok: true, saved: result.count, status: result.status },
    { headers: { "Cache-Control": "no-store" } }
  );
}