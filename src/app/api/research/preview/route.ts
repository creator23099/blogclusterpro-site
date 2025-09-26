// src/app/api/research/preview/route.ts
export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

function hostFromUrl(u?: string | null) {
  try {
    if (!u) return null;
    const h = new URL(u).hostname.replace(/^www\./, "");
    return h || null;
  } catch {
    return null;
  }
}

export async function GET(req: NextRequest) {
  const jobId = req.nextUrl.searchParams.get("jobId")?.trim();
  if (!jobId) {
    return NextResponse.json({ ok: false, error: "Missing jobId" }, { status: 400 });
  }

  try {
    // ---------- Build a URL -> summary map from keyword suggestions ----------
    // This lets us backfill an article snippet when DB snippet is null.
    const sugRows = await db.keywordSuggestion.findMany({
      where: { jobId },
      select: { newsUrls: true, newsMeta: true },
    });

    const summaryByUrl = new Map<string, string>();
    for (const row of sugRows) {
      const urls: string[] = Array.isArray(row.newsUrls) ? (row.newsUrls as unknown as string[]) : [];
      const metaArr: any[] = Array.isArray(row.newsMeta) ? (row.newsMeta as unknown as any[]) : [];
      const n = Math.min(urls.length, metaArr.length);
      for (let i = 0; i < n; i++) {
        const u = urls[i];
        const s = metaArr[i]?.summary?.trim?.() || "";
        if (u && s && !summaryByUrl.has(u)) {
          summaryByUrl.set(u, s);
        }
      }
    }

    // ---------- Pull top 5 articles ----------
    const articles = await db.researchArticle.findMany({
      where: { jobId },
      orderBy: [{ rank: "asc" }, { publishedTime: "desc" }],
      take: 5,
      select: {
        id: true,
        url: true,
        title: true,
        sourceName: true,
        publishedTime: true,
        snippet: true,
      },
    });

    // Normalize each article:
    // - sourceName -> hostname fallback (and ignore "unknown_source")
    // - snippet -> DB snippet or fallback summaryByUrl[url]
    const cleanArticles = articles.map((a) => {
      const label =
        a.sourceName && a.sourceName !== "unknown_source"
          ? a.sourceName
          : hostFromUrl(a.url) ?? "—";

      const snippet =
        (a.snippet?.trim() || null) ||
        (a.url ? summaryByUrl.get(a.url) ?? null : null);

      return {
        ...a,
        sourceName: label,
        snippet,
      };
    });

    // ---------- Supporting topics ----------
    const topics = await db.researchTopicSuggestion.findMany({
      where: { jobId },
      orderBy: [{ label: "asc" }],
      select: { label: true, tier: true },
    });

    const grouped: { top: string[]; rising: string[]; all: string[] } = {
      top: [],
      rising: [],
      all: [],
    };
    const seen = new Set<string>();
    for (const t of topics) {
      const label = String(t.label || "").trim();
      if (!label) continue;
      const key = label.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      if (t.tier === "top") grouped.top.push(label);
      else if (t.tier === "rising") grouped.rising.push(label);
      else grouped.all.push(label);
    }

    return NextResponse.json(
      {
        ok: true,
        articles: cleanArticles,
        supportingTopics: grouped,
      },
      { status: 200 }
    );
  } catch (err: any) {
    console.error("[research/preview] ERROR:", err?.stack || err?.message || err);
    return NextResponse.json({ ok: false, error: "server_error" }, { status: 500 });
  }
}