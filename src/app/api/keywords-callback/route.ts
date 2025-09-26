// src/app/api/keywords-callback/route.ts
export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getDbUserIdFromClerk } from "@/lib/getDbUserId";
import { ResearchStatus } from "@prisma/client";

/* =========================
   Helpers
   ========================= */
function clamp(s: unknown, max: number): string | null {
  if (typeof s !== "string") return null;
  const t = String(s).trim();
  return t ? (t.length > max ? t.slice(0, max) : t) : null;
}

function safeNewsMeta(raw: any) {
  if (!raw || typeof raw !== "object") return null;
  const meta = {
    title: clamp(raw.title, 160),
    description: clamp(raw.description, 600),
    publishedTime: typeof raw.publishedTime === "string" ? raw.publishedTime : null,
    sourceName: clamp(raw.sourceName, 80),
    imageUrl: clamp(raw.imageUrl, 512),
  };
  return Object.values(meta).every((v) => !v) ? null : meta;
}

type Suggestion = {
  keyword: string;
  score?: number | null;
  sourceUrl?: string | null;
  newsUrls?: string[];
  newsMeta?: ReturnType<typeof safeNewsMeta> | null;
};

function normalizeSuggestions(list: any): Suggestion[] {
  const arr = Array.isArray(list) ? list : [];
  const out: Suggestion[] = [];
  const seenKeyword = new Set<string>();

  for (const s of arr) {
    const keyword = (clamp(s?.keyword, 200) ?? "").toLowerCase();
    if (!keyword || seenKeyword.has(keyword)) continue;
    seenKeyword.add(keyword);

    let score: number | null = null;
    if (typeof s?.score === "number") score = s.score;
    else if (typeof s?.score === "string" && !Number.isNaN(Number(s.score))) score = Number(s.score);

    const sourceUrl = typeof s?.sourceUrl === "string" ? clamp(s.sourceUrl, 1024) : null;

    const urlSeen = new Set<string>();
    const urls: string[] = [];
    if (Array.isArray(s?.newsUrls)) {
      for (const u of s.newsUrls) {
        if (typeof u !== "string") continue;
        const cu = clamp(u, 1024);
        if (!cu || urlSeen.has(cu)) continue;
        urlSeen.add(cu);
        urls.push(cu);
        if (urls.length >= 12) break;
      }
    }

    out.push({ keyword, score, sourceUrl, newsUrls: urls, newsMeta: safeNewsMeta(s?.newsMeta) ?? null });
  }

  return out;
}

function dedupeTopicSuggestions(items: any[]): { label: string; tier: string }[] {
  const out: { label: string; tier: string }[] = [];
  const seen = new Set<string>();
  for (const t of items || []) {
    const label = String(t?.label ?? "").trim();
    const tier = String(t?.tier ?? "").trim();
    if (!label || !tier) continue;
    const key = `${label.toLowerCase()}|${tier}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ label, tier });
  }
  return out;
}

function dedupeArticles(items: any[]): any[] {
  const out: any[] = [];
  const seen = new Set<string>();
  for (const a of items || []) {
    const url = String(a?.url ?? "").trim();
    if (!url || seen.has(url)) continue;
    seen.add(url);
    out.push(a);
  }
  return out;
}

/* Turn uiPayload topics/arrays into KeywordSuggestion[] if needed */
function suggestionsFromUiPayload(uiPayload: any): Suggestion[] {
  // 1) Prefer explicit suggestions/keywords if present
  if (Array.isArray(uiPayload?.suggestions) || Array.isArray(uiPayload?.keywords)) {
    return normalizeSuggestions(uiPayload.suggestions ?? uiPayload.keywords);
  }

  // 2) Else derive from topics.{top|rising|all}
  const top = Array.isArray(uiPayload?.topics?.top) ? uiPayload.topics.top : [];
  const rising = Array.isArray(uiPayload?.topics?.rising) ? uiPayload.topics.rising : [];
  const all = Array.isArray(uiPayload?.topics?.all) ? uiPayload.topics.all : [];
  const merged = [...top, ...rising, ...all];

  const seen = new Set<string>();
  const derived: Suggestion[] = [];
  for (const k of merged) {
    const kw = (clamp(k, 200) ?? "").toLowerCase();
    if (!kw || seen.has(kw)) continue;
    seen.add(kw);
    derived.push({ keyword: kw, score: null, sourceUrl: null, newsUrls: [], newsMeta: null });
  }
  return derived;
}

/* =========================
   Route
   ========================= */
export async function POST(req: NextRequest) {
  // Shared-secret auth (from n8n)
  const secret = req.headers.get("x-ingest-secret");
  if (!process.env.N8N_INGEST_SECRET || secret !== process.env.N8N_INGEST_SECRET) {
    return new Response("Forbidden", { status: 403 });
  }

  let body: any;
  try {
    body = await req.json();
  } catch {
    return new Response("Invalid JSON", { status: 400 });
  }

  try {
    /* --------------------------
       Branch C: New n8n payload (uiPayload + dbPayload)
       -------------------------- */
    if (body?.uiPayload && body?.dbPayload) {
      const { uiPayload, dbPayload } = body;

      if (!dbPayload?.jobId || typeof dbPayload.jobId !== "string") {
        return NextResponse.json({ ok: false, error: "Missing jobId in dbPayload" }, { status: 400 });
      }

      // De-dupe upstream arrays
      const cleanArticles = dedupeArticles(dbPayload.articles || []);
      const cleanTopics = dedupeTopicSuggestions(dbPayload.topic_suggestions || []);

      // Build KeywordSuggestion[] from uiPayload (suggestions/keywords or topics.*)
      const keywordSuggestions = suggestionsFromUiPayload(uiPayload);

      await db.$transaction(async (tx) => {
        // Mark job READY and cache the UI payload
        await tx.keywordsJob.update({
          where: { id: dbPayload.jobId },
          data: {
            status: ResearchStatus.READY,
            uiPayload: uiPayload ?? undefined, // Json column exists on KeywordsJob
            completedAt: new Date(),
          },
        });

        // Replace keyword suggestions (avoid dupes)
        await tx.keywordSuggestion.deleteMany({ where: { jobId: dbPayload.jobId } });
        if (keywordSuggestions.length) {
          // createMany for speed; model has generated id, no unique on (jobId, keyword) needed since we cleared first
          await tx.keywordSuggestion.createMany({
            data: keywordSuggestions.map((s) => ({
              jobId: dbPayload.jobId,
              keyword: s.keyword,
              score: s.score ?? null,
              sourceUrl: s.sourceUrl ?? null,
              newsUrls: (s.newsUrls ?? []) as any,
              newsMeta: s.newsMeta ? (s.newsMeta as any) : undefined,
            })),
            skipDuplicates: true,
          });
        }

        // Replace articles
        await tx.researchArticle.deleteMany({ where: { jobId: dbPayload.jobId } });
        if (cleanArticles.length) {
          await tx.researchArticle.createMany({
            data: cleanArticles.map((a: any) => ({
              id: a.id, // required by schema
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
        await tx.researchTopicSuggestion.deleteMany({ where: { jobId: dbPayload.jobId } });
        if (cleanTopics.length) {
          await tx.researchTopicSuggestion.createMany({
            data: cleanTopics.map((t) => ({
              jobId: dbPayload.jobId,
              label: t.label,
              tier: t.tier, // 'top' | 'rising' | 'all'
            })),
            skipDuplicates: true,
          });
        }
      });

      return NextResponse.json(
        {
          ok: true,
          counts: {
            keywordSuggestions: keywordSuggestions.length,
            articles: cleanArticles.length,
            topicSuggestions: cleanTopics.length,
          },
        },
        { status: 200 }
      );
    }

    /* --------------------------
       Branch A: Older KeywordsJob/Suggestion payload
       -------------------------- */
    const isResearch =
      !!body?.requestId ||
      !!body?.jobId ||
      (Array.isArray(body?.suggestions) || Array.isArray(body?.keywords));

    if (isResearch) {
      const id: string = String(body.requestId || body.jobId || "").trim();
      if (!id) return new Response("Missing jobId/requestId", { status: 400 });

      const statusStr: string = body.status ?? "READY";
      const status =
        statusStr === "FAILED"
          ? ResearchStatus.FAILED
          : statusStr === "RUNNING"
          ? ResearchStatus.RUNNING
          : ResearchStatus.READY;

      const suggestions = normalizeSuggestions(
        Array.isArray(body.suggestions) ? body.suggestions : body.keywords
      );

      const job = await db.keywordsJob.upsert({
        where: { id },
        create: {
          id,
          requestId: id,
          userId: body.userId || "unknown",
          topic: body.topic ?? "unspecified",
          location: body.location ?? "GLOBAL",
          status,
          startedAt: status === ResearchStatus.RUNNING ? new Date() : undefined,
          completedAt: status !== ResearchStatus.RUNNING ? new Date() : undefined,
        },
        update: {
          status,
          topic: body.topic ?? undefined,
          location: body.location ?? undefined,
          completedAt: status !== ResearchStatus.RUNNING ? new Date() : undefined,
        },
        select: { id: true },
      });

      // Replace keyword suggestions to avoid duplicates
      await db.keywordSuggestion.deleteMany({ where: { jobId: job.id } });
      if (suggestions.length) {
        await db.keywordSuggestion.createMany({
          data: suggestions.map((s) => ({
            jobId: job.id,
            keyword: s.keyword,
            score: s.score ?? null,
            sourceUrl: s.sourceUrl ?? null,
            newsUrls: (s.newsUrls ?? []) as any,
            newsMeta: s.newsMeta ? (s.newsMeta as any) : undefined,
          })),
          skipDuplicates: true,
        });
      }

      return NextResponse.json(
        { ok: true, jobId: job.id, added: suggestions.length, status },
        { status: 200 }
      );
    }

    /* --------------------------
       Branch B: Legacy cluster/posts (idempotent)
       -------------------------- */
    if (!body?.clerkUserId || !body?.cluster?.title) {
      return NextResponse.json(
        { ok: false, error: "Missing clerkUserId or cluster.title" },
        { status: 400 }
      );
    }

    const { clerkUserId, cluster, posts = [], eventId } = body;

    const result = await db.$transaction(async (tx) => {
      // idempotency via KeywordsJob if eventId provided
      if (eventId) {
        const seen = await tx.keywordsJob.findUnique({ where: { id: eventId } });
        if (!seen) await tx.keywordsJob.create({ data: { id: eventId, userId: clerkUserId } });
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

    return NextResponse.json(result, { status: 200 });
  } catch (err: any) {
    console.error("[keywords-callback] ERROR:", err?.stack || err?.message || err);
    return NextResponse.json({ ok: false, error: "server_error" }, { status: 500 });
  }
}