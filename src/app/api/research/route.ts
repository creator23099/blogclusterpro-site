import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { ResearchStatus } from "@prisma/client";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  // Clerk auth
  const { userId } = await auth(req);
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Ensure required envs exist
  if (!process.env.N8N_KEYWORDS_URL || !process.env.N8N_INGEST_SECRET) {
    return NextResponse.json({ error: "Server not configured" }, { status: 500 });
  }

  // Parse request body
  const body = await req.json().catch(() => ({}));
  const topic = (body?.topic ?? "").trim();
  if (!topic) {
    return NextResponse.json({ error: "Topic is required" }, { status: 400 });
  }

  // Create jobId + persist in DB
  const jobId = `kw_${Date.now()}`;
  await db.keywordsJob.create({
    data: {
      id: jobId,
      userId,
      topic,
      country: body?.country ?? "US",
      region: body?.region ?? "ALL",     // or rename to state if UI uses `state`
      location: body?.location ?? "US:ALL",
      status: ResearchStatus.RUNNING,
    },
  });

  // Call n8n webhook
  const resp = await fetch(process.env.N8N_KEYWORDS_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-INGEST-SECRET": process.env.N8N_INGEST_SECRET,
    },
    body: JSON.stringify({
      jobId,
      userId,
      topic,
      country: body?.country ?? "US",
      region: body?.region ?? "ALL",
      location: body?.location ?? "US:ALL",
    }),
    cache: "no-store",
  });

  if (!resp.ok) {
    await db.keywordsJob.update({
      where: { id: jobId },
      data: {
        status: ResearchStatus.FAILED,
        error: `n8n webhook failed: ${resp.status}`,
      },
    });
    return NextResponse.json({ error: "Failed to start research", jobId }, { status: 502 });
  }

  return NextResponse.json({ ok: true, jobId, userId });
}