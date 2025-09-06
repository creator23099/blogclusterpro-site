// src/app/api/keywords/suggest/route.ts
import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { PrismaClient } from "@prisma/client";
import { randomUUID } from "crypto";

type Payload = {
  jobId?: string;
  niche: string;
  location?: string;
  country?: string;
  region?: string;
};

const db = new PrismaClient();

const N8N_URL = process.env.N8N_KEYWORDS_URL!;
const SHARED_SECRET = process.env.N8N_INGEST_SECRET!;

export async function POST(req: Request) {
  try {
    // Use Clerk if present, otherwise fall back to a service user in dev/tunnel
    const { userId: clerkUserId } = auth();
    const userId = clerkUserId ?? "system";

    const body = (await req.json()) as Partial<Payload>;
    if (!body?.niche) {
      return NextResponse.json({ error: "Missing niche" }, { status: 400 });
    }

    const jobId = (body.jobId && String(body.jobId)) || `kw_${randomUUID()}`;

    await db.keywordsJob.upsert({
      where: { id: jobId },
      update: {
        userId,
        topic: body.niche ?? "unspecified",
        country: body.country ?? "US",
        region: body.region ?? "ALL",
        location: body.location ?? "GLOBAL",
        status: "QUEUED",
        startedAt: new Date(),
        updatedAt: new Date(),
      },
      create: {
        id: jobId,
        userId,
        topic: body.niche ?? "unspecified",
        country: body.country ?? "US",
        region: body.region ?? "ALL",
        location: body.location ?? "GLOBAL",
        status: "QUEUED",
        startedAt: new Date(),
      },
    });

    const res = await fetch(N8N_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-INGEST-SECRET": SHARED_SECRET,
      },
      body: JSON.stringify({
        userId,
        jobId,
        topic: body.niche,
        country: body.country ?? "US",
        region: body.region ?? "ALL",
        location: body.location ?? "GLOBAL",
      }),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      await db.keywordsJob.update({
        where: { id: jobId },
        data: { status: "ERRORED", error: `n8n ${res.status}: ${text.slice(0, 300)}` },
      });
      return NextResponse.json(
        { error: `n8n error ${res.status}`, detail: text.slice(0, 500), jobId },
        { status: 502 }
      );
    }

    await db.keywordsJob.update({
      where: { id: jobId },
      data: { status: "RUNNING", updatedAt: new Date() },
    });

    return NextResponse.json({ ok: true, jobId });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message ?? "Bad request" }, { status: 400 });
  }
}