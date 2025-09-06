// src/app/api/research/route.ts
import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { ResearchStatus } from "@prisma/client";

export const dynamic = "force-dynamic";

type BodyV1 = {
  topic?: string;
  country?: "GLOBAL" | "US" | "CA" | string;
  region?: string;    // "ALL" or code
  location?: string;  // e.g. "GLOBAL" | "US" | "US:CA"
  clusterId?: string | null;
};

type BodyAlt = {
  topic?: string;
  clusterId?: string | null;
  location?: { country?: string; state?: string | null } | null;
};

function toLocationStringFromParts(country?: string, state?: string | null) {
  const c = (country || "GLOBAL").toUpperCase().trim();
  if (c === "GLOBAL") return "GLOBAL";
  const s = (state || "ALL").toUpperCase().trim();
  return s === "ALL" ? c : `${c}:${s}`;
}

export async function POST(req: Request) {
  // ⬇️ make auth() resilient across environments
  const { userId } = await auth();
  // quick one-off debug (check in Vercel → Functions → Logs)
  console.log("[/api/research] cookie?", !!req.headers.get("cookie"), "userId:", userId);

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let raw: BodyV1 | BodyAlt;
  try {
    raw = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const topic = (raw.topic ?? "").trim();
  if (!topic) return NextResponse.json({ error: "Topic is required" }, { status: 400 });

  let country = "GLOBAL";
  let region = "ALL";
  let locationString = "GLOBAL";

  if ("country" in raw || "region" in raw || "location" in raw) {
    const r1 = raw as BodyV1;
    country = r1.country ?? "GLOBAL";
    region = r1.region ?? "ALL";
    locationString = r1.location?.trim() || toLocationStringFromParts(country, region);
  } else {
    const r2 = raw as BodyAlt;
    const c = r2.location?.country ?? "GLOBAL";
    const s = r2.location?.state ?? "ALL";
    country = c;
    region = s ?? "ALL";
    locationString = toLocationStringFromParts(c, s);
  }

  const clusterId = ("clusterId" in raw ? (raw as any).clusterId : null) || null;

  const jobId = `kw_${Date.now()}`;

  await db.keywordsJob.create({
    data: {
      id: jobId,
      userId,
      topic: topic || "unspecified",
      country,
      region,
      location: locationString,
      clusterId,
      status: ResearchStatus.RUNNING,
    },
  });

  const url = process.env.N8N_KEYWORDS_URL;
  if (!url) {
    console.warn("[research] N8N_KEYWORDS_URL missing; job created but no workflow triggered");
  } else {
    const outbound = {
      jobId,
      userId,
      topic,
      country,
      region,
      location: locationString,
      clusterId,
      source: "dashboard",
      requestedAt: new Date().toISOString(),
    };

    try {
      const res = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-INGEST-SECRET": process.env.N8N_INGEST_SECRET || "",
        },
        body: JSON.stringify(outbound),
        cache: "no-store",
      });

      if (!res.ok) {
        console.error("[research] n8n trigger failed:", res.status, await res.text());
      }
    } catch (e) {
      console.error("[research] n8n trigger error:", e);
    }
  }

  return NextResponse.json(
    { ok: true, jobId, redirectUrl: `/keywords/${jobId}` },
    { headers: { "Cache-Control": "no-store" } }
  );
}