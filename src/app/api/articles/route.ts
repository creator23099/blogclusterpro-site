import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Maps n8n “Assemble Draft Payload” → Prisma Post
export async function POST(req: Request) {
  // 1) auth
  if (req.headers.get("x-ingest-secret") !== process.env.INGEST_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // 2) payload
  const body = await req.json();

  const slug: string = body.slug;
  const title: string = body.title ?? "";
  const type = String(body.type || "supporting").toUpperCase() === "PILLAR" ? "PILLAR" : "SUPPORTING";
  const contentMd: string = body?.draft?.draft_md ?? "";
  const outline = body?.outline ?? null;

  const meta = {
    meta_description: body?.meta_description ?? null,
    seo_title: body?.seo_title ?? null,
    summary: body?.summary ?? null,
    word_count: body?.word_count ?? null,
    cta: body?.cta ?? null,
  };

  const citations = {
    research_sources: body?.research?.sources ?? [],
    sources_used: body?.draft?.sources_used ?? [],
  };

  const parentSlug = body?.parent_slug ?? body?.internal_link?.parent_slug ?? null;

  // 3) ensure a cluster (Post.clusterId is required in your schema)
  // If n8n sends clusterId, use it; otherwise create/find a system user + default cluster.
  let clusterId: string | null = body?.clusterId ?? null;

  if (!clusterId) {
    // upsert a “system” user
    const systemUser = await prisma.user.upsert({
      where: { clerkId: "system-user" },
      create: { clerkId: "system-user", email: "system@bcp.local" },
      update: {},
      select: { id: true },
    });

    const defaultCluster = await prisma.cluster.upsert({
      where: { id: "default-writer-cluster" },
      create: {
        id: "default-writer-cluster",
        userId: systemUser.id,
        title: "Default Writer Cluster",
        niche: "general",
      },
      update: {},
      select: { id: true },
    });

    clusterId = defaultCluster.id;
  }

  // 4) upsert Post by slug
  const post = await prisma.post.upsert({
    where: { slug },
    update: {
      title,
      type,
      parentSlug,
      outline,
      outlineStatus: outline ? "READY" : "NONE",
      content: contentMd,
      draftStatus: "READY",
      status: "READY",
      meta,
      citations,
    },
    create: {
      slug,
      title,
      clusterId: clusterId!,
      type,
      parentSlug,
      outline,
      outlineStatus: outline ? "READY" : "NONE",
      content: contentMd,
      draftStatus: "READY",
      status: "READY",
      meta,
      citations,
    },
  });

  return NextResponse.json({ ok: true, id: post.id, slug: post.slug });
}