// src/app/api/internal/n8n/outline/start/route.ts
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const { jobId, topics, articles } = await req.json();

    if (!jobId) {
      return NextResponse.json({ ok: false, error: "Missing jobId" }, { status: 400 });
    }

    const url = process.env.N8N_FORMATTER_WEBHOOK_URL; // e.g. https://market5109.app.n8n.cloud/webhook/formatter/start
    if (!url) {
      return NextResponse.json({ ok: false, error: "N8N_FORMATTER_WEBHOOK_URL not set" }, { status: 500 });
    }

    const res = await fetch(url, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        ...(process.env.N8N_WEBHOOK_SECRET
          ? { "X-Webhook-Secret": process.env.N8N_WEBHOOK_SECRET }
          : {}),
      },
      body: JSON.stringify({
        jobId,
        topics: Array.isArray(topics) ? topics : [],
        articles: Array.isArray(articles) ? articles : [],
      }),
      cache: "no-store",
    });

    const text = await res.text();
    let data: any = null;
    try { data = JSON.parse(text); } catch {}

    return NextResponse.json(
      { ok: res.ok, status: res.status, upstream: data ?? text },
      { status: res.ok ? 200 : 502 }
    );
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err?.message ?? "Unknown error" }, { status: 400 });
  }
}