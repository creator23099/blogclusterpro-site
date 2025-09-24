export const runtime = "nodejs";

import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { getDbUserIdFromClerk } from "@/lib/getDbUserId";
import { ResearchStatus } from "@prisma/client";

/* =========================
   Types
   ========================= */

type Suggestion = {
  keyword: string;
  score?: number | null;
  sourceUrl?: string | null;
  newsUrls?: string[];
};

type ResearchPayload = {
  requestId?: string;
  jobId?: string;
  status?: "QUEUED" | "RUNNING" | "READY" | "FAILED";
  userId?: string | null;
  topic?: string;
  location?: string;
  suggestions?: Suggestion[];
  keywords?: Suggestion[];

  // alt shape coming from n8n
  keyword?: string; // single keyword
  reads?: Array<{ url?: string | null; [k: string]: any }>;
};

type IncomingPost = { title?: string; slug: string; status?: string; content?: string };
type LegacyPayload = {
  clerkUserId: string;
  cluster: { title: string; niche?: string };
  posts?: IncomingPost[];
  eventId?: string;
};

/* =========================
   Helpers
   ========================= */

function isResearchPayload(b: any): b is ResearchPayload {
  const hasId = !!b?.requestId || !!b?.jobId;
  const hasList = Array.isArray(b?.suggestions) || Array.isArray(b?.keywords);
  // also consider alt shape keyword+reads as research payload
  const hasKeywordReads = typeof b?.keyword === "string" || Array.isArray(b?.reads);
  return hasId || hasList || hasKeywordReads;
}

function normalizeSuggestions(list: any): Suggestion[] {
  const arr = Array.isArray(list) ? list : [];
  return arr
    .map((s) => ({
      keyword: String(s?.keyword ?? "").trim(),
      score: typeof s?.score === "number" ? s.score : s?.score ?? null,
      sourceUrl: s?.sourceUrl ?? null,
      newsUrls: Array.isArray(s?.newsUrls) ? s.newsUrls : [],
    }))
    .filter((s) => s.keyword);
}

// Build suggestions from alt payload { keyword, reads[] }
function suggestionsFromKeywordReads(b: ResearchPayload): Suggestion[] {
  const kw = String(b.keyword ?? "").trim();
  const urls =
    Array.isArray(b.reads) ? b.reads.map((r) => String(r?.url ?? "").trim()).filter(Boolean) : [];
  if (!kw && urls.length === 0) return [];
  return [
    {
      keyword: kw || "unspecified",
      score: null,
      sourceUrl: null,
      newsUrls: urls,
    },
  ];
}

/* =========================
   Route
   ========================= */

export async function POST(req: NextRequest) {
  // --- Auth: shared secret ---
  const secret = req.headers.get("x-ingest-secret");
  if (secret !== process.env.N8N_INGEST_SECRET) {
    return new Response("Forbidden", { status: 403 });
  }

  // --- Parse body ---
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return new Response("Invalid JSON", { status: 400 });
  }

  try {
    /* --------------------------
       Branch A: Research results
       -------------------------- */
    if (isResearchPayload(body)) {
      const rp = body as ResearchPayload;
      const id = (rp.requestId || rp.jobId || "").trim();
      if (!id) {
        return new Response("Missing jobId/requestId", { status: 400 });
      }

      // If n8n sent reads/keyword, treat as READY unless explicitly FAILED/RUNNING
      const statusStr = rp.status ?? (rp.reads || rp.keyword ? "READY" : "READY");
      const status =
        statusStr === "FAILED"
          ? ResearchStatus.FAILED
          : statusStr === "RUNNING"
          ? ResearchStatus.RUNNING
          : ResearchStatus.READY;

      // Prefer suggestions/keywords; otherwise synthesize from {keyword, reads}
      let suggestions = normalizeSuggestions(
        Array.isArray(rp.suggestions) ? rp.suggestions : rp.keywords
      );
      if (!suggestions.length) {
        suggestions = suggestionsFromKeywordReads(rp);
      }

      // Upsert job
      const job = await db.keywordsJob.upsert({
        where: { id },
        create: {
          id,
          requestId: id,
          userId: rp.userId || "unknown",
          topic: rp.topic ?? rp.keyword ?? "",
          location: rp.location ?? "GLOBAL",
          status,
        },
        update: {
          status,
          topic: (rp.topic ?? rp.keyword) || undefined,
          location: rp.location ?? undefined,
        },
        select: { id: true },
      });

      // Insert suggestions (if any)
      let added = 0;
      if (suggestions.length) {
        await db.$transaction(
          suggestions.map((s) =>
            db.keywordSuggestion.create({
              data: {
                jobId: job.id,
                keyword: s.keyword,
                score: s.score ?? null,
                sourceUrl: s.sourceUrl ?? null,
                // Prisma JSON column
                newsUrls: (s.newsUrls ?? []) as any,
              },
            })
          )
        );
        added = suggestions.length;
      }

      return new Response(
        JSON.stringify({ ok: true, jobId: job.id, added, status }),
        { status: 200, headers: { "content-type": "application/json" } }
      );
    }

    /* --------------------------
       Branch B: Legacy cluster/posts
       -------------------------- */
    const lp = body as LegacyPayload;
    if (!lp?.clerkUserId || !lp?.cluster?.title) {
      return new Response("Missing clerkUserId or cluster.title", { status: 400 });
    }

    const { clerkUserId, cluster, posts = [], eventId } = lp;

    const result = await db.$transaction(async (tx) => {
      // idempotency check
      if (eventId) {
        const seen = await tx.keywordsJob.findUnique({ where: { id: eventId } });
        if (seen) return { ok: true, idempotent: true };
        await tx.keywordsJob.create({ data: { id: eventId, userId: clerkUserId } });
      }

      const dbUserId = await getDbUserIdFromClerk(clerkUserId);

      // Cluster find-or-create
      let clusterRow = await tx.cluster.findFirst({
        where: { userId: dbUserId, title: cluster.title },
        select: { id: true },
      });

      if (!clusterRow) {
        clusterRow = await tx.cluster.create({
          data: {
            userId: dbUserId,
            title: cluster.title,
            niche: cluster.niche ?? "",
            status: "DRAFT",
          },
          select: { id: true },
        });
      } else {
        await tx.cluster.update({
          where: { id: clusterRow.id },
          data: { niche: cluster.niche ?? "" },
        });
      }

      // Upsert posts
      let affected = 0;
      for (const p of posts) {
        if (!p?.slug) continue;

        const existing = await tx.post.findFirst({
          where: { clusterId: clusterRow.id, slug: p.slug },
          select: { id: true },
        });

        if (!existing) {
          await tx.post.create({
            data: {
              clusterId: clusterRow.id,
              slug: p.slug,
              title: p.title ?? p.slug,
              status: (p.status as any) ?? "DRAFT",
              content: p.content ?? "",
            },
          });
        } else {
          await tx.post.update({
            where: { id: existing.id },
            data: {
              title: p.title ?? p.slug,
              status: (p.status as any) ?? "DRAFT",
              content: p.content ?? "",
            },
          });
        }
        affected++;
      }

      // Usage bump
      if (affected > 0) {
        const now = new Date();
        const periodKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
        await tx.usage.upsert({
          where: {
            userId_metric_periodKey: { userId: dbUserId, metric: "blogs", periodKey },
          },
          create: { userId: dbUserId, metric: "blogs", periodKey, amount: affected },
          update: { amount: { increment: affected } },
        });
      }

      return { ok: true, clusterId: clusterRow.id, postsAddedOrUpdated: affected };
    });

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  } catch (err) {
    console.error("INGEST_ERROR", err);
    return new Response("Server error", { status: 500 });
  }
}