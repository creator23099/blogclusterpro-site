export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(req: NextRequest) {
  const jobId = req.nextUrl.searchParams.get("jobId")?.trim();
  if (!jobId) {
    return NextResponse.json({ ok: false, error: "Missing jobId" }, { status: 400 });
  }

  try {
    // Top 5, ranked asc then newest
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

    const topics = await db.researchTopicSuggestion.findMany({
      where: { jobId },
      orderBy: [{ label: "asc" }],
      select: { label: true, tier: true },
    });

    const grouped: { top: string[]; rising: string[]; all: string[] } = { top: [], rising: [], all: [] };
    const seen = new Set<string>();
    for (const t of topics) {
      const label = (t.label || "").trim();
      const tier = (t.tier || "").trim().toLowerCase(); // 'top' | 'rising' | 'all'
      if (!label || !tier) continue;
      const key = `${tier}|${label.toLowerCase()}`;
      if (seen.has(key)) continue;
      seen.add(key);

      if (tier === "top") grouped.top.push(label);
      else if (tier === "rising") grouped.rising.push(label);
      else grouped.all.push(label);
    }

    return NextResponse.json({ ok: true, jobId, articles, topics: grouped }, { status: 200 });
  } catch (err: any) {
    console.error("[preview] ERROR:", err?.stack || err?.message || err);
    return NextResponse.json({ ok: false, error: "server_error" }, { status: 500 });
  }
}