// src/app/api/keywords-callback/route.ts
export const runtime = "nodejs";

import { NextRequest } from "next/server";
import db from "@/lib/db";                           // ⬅ default import (matches other routes)
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
  newsMeta?: {
    title?: string | null;
    description?: string | null;
    publishedTime?: string | null;
    sourceName?: string | null;
    imageUrl?: string | null;
  } | null;
};

type ResearchPayload = {
  requestId?: string;
  jobId?: string; // alias
  status?: "QUEUED" | "RUNNING" | "READY" | "FAILED";
  userId?: string | null;
  topic?: string;
  location?: string;
  suggestions?: Suggestion[];
  keywords?: Suggestion[]; // alias
};

type IncomingPost = { title?: string; slug: string; status?: string; content?: string };
type LegacyPayload = {
  clerkUserId: string;
  cluster: { title: string; niche?: string };
  posts?: IncomingPost[];
  eventId?: string; // idempotency key for legacy path
};

/* =========================
   Safeguards / helpers
   ========================= */

function clamp(str: unknown, max: number): string | null {
  if (typeof str !== "string") return null;
  if (!str) return null;
  return str.length > max ? str.slice(0, max) : str;
}

function isResearchPayload(b: any): b is ResearchPayload {
  const hasId = !!b?.requestId || !!b?.jobId;
  const hasList = Array.isArray(b?.suggestions) || Array.isArray(b?.keywords);
  return hasId || (typeof b?.status === "string" && hasList);
}

function safeNewsMeta(raw: any):
  | {
      title?: string | null;
      description?: string | null;
      publishedTime?: string | null;
      sourceName?: string | null;
      imageUrl?: string | null;
    }
  | null {
  if (!raw || typeof raw !== "object") return null;

  // Tight caps to avoid bloating the row
  const meta = {
    title: clamp(raw.title, 160),
    description: clamp(raw.description, 600), // summary limit
    publishedTime: typeof raw.publishedTime === "string" ? raw.publishedTime : null,
    sourceName: clamp(raw.sourceName, 80),
    imageUrl: clamp(raw.imageUrl, 512),
  };

  const allNull = Object.values(meta).every((v) => !v);
  return allNull ? null : meta;
}

function normalizeSuggestions(list: any): Suggestion[] {
  const arr = Array.isArray(list) ? list : [];
  const out: Suggestion[] = [];

  for (const s of arr) {
    const keyword = clamp(s?.keyword, 200)?.trim() || "";
    if (!keyword) continue;

    let score: number | null = null;
    if (typeof s?.score === "number") score = s.score;
    else if (typeof s?.score === "string" && !Number.isNaN(Number(s.score))) score = Number(s.score);

    const sourceUrl = typeof s?.sourceUrl === "string" ? clamp(s.sourceUrl, 1024) : null;

    const seen = new Set<string>();
    const urls: string[] = [];
    if (Array.isArray(s?.newsUrls)) {
      for (const u of s.newsUrls) {
        if (typeof u !== "string") continue;
        const cu = clamp(u, 1024);
        if (!cu) continue;
        if (!seen.has(cu)) {
          seen.add(cu);
          urls.push(cu);
          if (urls.length >= 12) break;
        }
      }
    }

    const newsMeta = safeNewsMeta(s?.newsMeta);

    out.push({ keyword, score, sourceUrl, newsUrls: urls, newsMeta });
  }

  return out;
}

/* =========================
   Route
   ========================= */

export async function POST(req: NextRequest) {
  // --- Auth: shared secret (from n8n) ---
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
       Branch C: New n8n final payload (uiPayload + dbPayload)
       -------------------------- */
    if ((body as any)?.uiPayload && (body as any)?.dbPayload) {
      const { uiPayload, dbPayload } = body as any;

      if (!dbPayload?.jobId) {
        return new Response("Missing jobId in dbPayload", { status: 400 });
      }

      try {
        await db.$transaction(async (tx) => {
          // Mark job READY + (optionally) cache uiPayload on job
          await tx.researchJob.update({
            where: { id: dbPayload.jobId },
            data: {
              status: ResearchStatus.READY,
              suggestionId: uiPayload?.suggestionId ?? null,
              // If ResearchJob has a Json field `uiPayload`, keep next line; else remove it.
              uiPayload: uiPayload ?? undefined,
              completedAt: new Date(),
            },
          });

          // Replace articles
          if (Array.isArray(dbPayload.articles) && dbPayload.articles.length) {
            await tx.researchArticle.deleteMany({ where: { jobId: dbPayload.jobId } });
            await tx.researchArticle.createMany({
              data: dbPayload.articles.map((a: any) => ({
                id: a.id,
                jobId: dbPayload.jobId,
                url: a.url,
                title: a.title ?? null,
                sourceName: a.source_name ?? null,
                publishedTime: a.published_time ? new Date(a.published_time) : null,
                rawText: a.raw_text ?? null,
                snippet: a.snippet ?? null,
                rank: a.rank ?? null,
                wordCount: a.word_count ?? null,
                relevanceScore: a.relevance_score ?? null,
              })),
              skipDuplicates: true,
            });
          }

          // Replace topic suggestions
          if (Array.isArray(dbPayload.topic_suggestions) && dbPayload.topic_suggestions.length) {
            await tx.researchTopicSuggestion.deleteMany({ where: { jobId: dbPayload.jobId } });
            await tx.researchTopicSuggestion.createMany({
              data: dbPayload.topic_suggestions.map((t: any) => ({
                jobId: dbPayload.jobId,
                label: String(t.label ?? "").trim(),
                tier: t.tier, // 'top' | 'rising' | 'all'
              })),
            });
          }
        });

        return new Response(JSON.stringify({ ok: true }), {
          status: 200,
          headers: { "content-type": "application/json" },
        });
      } catch (err: any) {
        await db.researchJob.update({
          where: { id: dbPayload.jobId },
          data: { status: ResearchStatus.FAILED, error: String(err?.message ?? err) },
        });
        return new Response("Store failed", { status: 500 });
      }
    }

    /* --------------------------
       Branch A: Research results (older KeywordsJob/Suggestion path)
       -------------------------- */
    if (isResearchPayload(body)) {
      const rp = body as ResearchPayload;
      const id = (rp.requestId || rp.jobId || "").trim();
      if (!id) return new Response("Missing jobId/requestId", { status: 400 });

      const statusStr = rp.status ?? "READY";
      const status =
        statusStr === "FAILED"
          ? ResearchStatus.FAILED
          : statusStr === "RUNNING"
          ? ResearchStatus.RUNNING
          : ResearchStatus.READY;

      const list = Array.isArray(rp.suggestions) ? rp.suggestions : rp.keywords;
      const suggestions = normalizeSuggestions(list);

      const job = await db.keywordsJob.upsert({
        where: { id },
        create: {
          id,
          requestId: id,
          userId: rp.userId || "unknown",
          topic: rp.topic ?? "",
          location: rp.location ?? "GLOBAL",
          status,
          startedAt: status === ResearchStatus.RUNNING ? new Date() : undefined,
          completedAt: status === ResearchStatus.READY || status === ResearchStatus.FAILED ? new Date() : undefined,
        },
        update: {
          status,
          topic: rp.topic ?? undefined,
          location: rp.location ?? undefined,
          completedAt: status === ResearchStatus.READY || status === ResearchStatus.FAILED ? new Date() : undefined,
        },
        select: { id: true },
      });

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
                newsUrls: (s.newsUrls ?? []) as any,
                newsMeta: s.newsMeta ? (s.newsMeta as any) : undefined,
              },
            })
          )
        );
        added = suggestions.length;
      }

      return new Response(JSON.stringify({ ok: true, jobId: job.id, added, status }), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    }

    /* --------------------------
       Branch B: Legacy cluster/posts (kept for backward-compat)
       -------------------------- */
    const lp = body as LegacyPayload;
    if (!lp?.clerkUserId || !lp?.cluster?.title) {
      return new Response("Missing clerkUserId or cluster.title", { status: 400 });
    }

    const { clerkUserId, cluster, posts = [], eventId } = lp;

    const result = await db.$transaction(async (tx) => {
      // idempotency via KeywordsJob table
      if (eventId) {
        const seen = await tx.keywordsJob.findUnique({ where: { id: eventId } });
        if (seen) return { ok: true, idempotent: true };
        await tx.keywordsJob.create({ data: { id: eventId, userId: clerkUserId } });
      }

      const dbUserId = await getDbUserIdFromClerk(clerkUserId);

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

      if (affected > 0) {
        const now = new Date();
        const periodKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
        await tx.usage.upsert({
          where: { userId_metric_periodKey: { userId: dbUserId, metric: "blogs", periodKey } },
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