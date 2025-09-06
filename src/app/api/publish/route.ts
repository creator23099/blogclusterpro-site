export const runtime = "nodejs";

import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { getDbUserIdFromClerk } from "@/lib/getDbUserId";
import { createSinglePost } from "@/services/publishing";

type Body = {
  clerkUserId: string;
  post: { slug: string; title: string; content?: string; status?: "DRAFT" | "READY" | "PUBLISHED" };
  cluster?: { title?: string; niche?: string };
  eventId?: string;
};

export async function POST(req: NextRequest) {
  const secret = req.headers.get("x-ingest-secret");
  if (secret !== process.env.SBN_INGEST_SECRET) {
    return new Response("Forbidden", { status: 403 });
  }

  let body: Body;
  try { body = await req.json(); } catch { return new Response("Invalid JSON", { status: 400 }); }
  const { clerkUserId, post, cluster, eventId } = body ?? {};
  if (!clerkUserId || !post?.slug || !post?.title) {
    return new Response("Missing clerkUserId or post fields", { status: 400 });
  }

  try {
    const result = await db.$transaction(async (tx) => {
      if (eventId) {
        const seen = await tx.keywordsJob.findUnique({ where: { id: eventId } });
        if (seen) return { ok: true, idempotent: true };
        await tx.keywordsJob.create({ data: { id: eventId, userId: clerkUserId, status: "READY" } });
      }

      const dbUserId = await getDbUserIdFromClerk(clerkUserId);

      const { clusterId } = await createSinglePost({
        dbUserId,
        clusterTitle: cluster?.title,
        clusterNiche: cluster?.niche,
        slug: post.slug,
        title: post.title,
        content: post.content,
        status: post.status ?? "DRAFT",
      });

      return { ok: true, clusterId };
    });

    return new Response(JSON.stringify(result), { status: 200, headers: { "content-type": "application/json" } });
  } catch (e) {
    console.error("PUBLISH_SINGLE_ERROR", e);
    return new Response("Server error", { status: 500 });
  }
}