// app/api/internal/run-n8n/route.ts
import { NextResponse } from "next/server";

export async function POST() {
  const url = process.env.N8N_WEBHOOK_URL;
  if (!url) {
    return NextResponse.json({ ok: false, error: "N8N_WEBHOOK_URL not set" }, { status: 500 });
  }

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    // Add fields your flow expects (e.g., userId, clusterId) later if needed
    body: JSON.stringify({ jobId: `job-${Date.now()}` }),
  });

  const json = await res.json().catch(() => ({}));
  return NextResponse.json({ ok: res.ok, n8n: json });
}