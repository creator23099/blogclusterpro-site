import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db"; // must export your Prisma client

/** ---------- Auth ---------- */
function requireInternalKey(req: NextRequest) {
  const key = req.headers.get("x-internal-key") || req.headers.get("X-Internal-Key");
  if (!key || key !== process.env.INTERNAL_API_KEY) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }
  return null;
}

/** ---------- Schemas ---------- */
const FlatOutlineSchema = z.object({
  id: z.string().optional(),
  slug: z.string().min(1),
  type: z.enum(["pillar", "supporting"]).default("supporting"),
  title: z.string().min(1),
  outline: z.object({
    h1: z.string().optional(),
    sections: z.array(
      z.object({
        heading: z.string().min(1),
        purpose: z.string().optional().default(""),
        key_points: z.array(z.string()).optional().default([]),
        suggested_internal_links: z
          .array(z.object({ slug: z.string(), anchor_text: z.string() }))
          .optional()
          .default([]),
        citation_placeholders: z.array(z.string()).optional().default([]),
      })
    ),
  }),
  metadata: z
    .object({
      target_word_count: z.number().optional(),
      cta: z.string().optional(),
      seo_keywords: z.array(z.string()).optional(),
      references_needed: z
        .array(
          z.object({
            topic: z.string().optional(),
            why_needed: z.string().optional(),
            example_query: z.string().optional(),
            preferred_domains: z.array(z.string()).optional(),
          })
        )
        .optional(),
    })
    .optional()
    .default({}),
  parent_slug: z.string().optional().nullable(),
  clusterId: z.string().optional(),
});

const NestedPayloadSchema = z.object({
  clusterId: z.string().optional(),
  post: FlatOutlineSchema.partial({ clusterId: true }),
});

type FlatOutline = z.infer<typeof FlatOutlineSchema>;

async function parseBody(req: NextRequest): Promise<{ post: FlatOutline; clusterId?: string }> {
  const json = await req.json();

  const nested = NestedPayloadSchema.safeParse(json);
  if (nested.success) {
    return {
      post: { ...nested.data.post, clusterId: nested.data.clusterId ?? nested.data.post.clusterId } as FlatOutline,
      clusterId: nested.data.clusterId ?? nested.data.post.clusterId,
    };
  }

  const flat = FlatOutlineSchema.safeParse(json);
  if (!flat.success) throw new Error(`Invalid payload: ${flat.error.message}`);
  return { post: flat.data, clusterId: flat.data.clusterId };
}

async function resolveParentId(parentSlug?: string | null) {
  if (!parentSlug) return null;
  const parent = await db.post.findUnique({ where: { slug: parentSlug } });
  return parent?.id ?? null;
}

function buildMeta(post: FlatOutline) {
  const { metadata = {}, type } = post;
  return { ...(metadata ?? {}), type };
}

/** ---------- Routes ---------- */

export async function GET() {
  return NextResponse.json({
    ok: true,
    route: "outline",
    requires: ["X-Internal-Key", "clusterId", "slug"],
  });
}

export async function POST(req: NextRequest) {
  const unauth = requireInternalKey(req);
  if (unauth) return unauth;

  try {
    const { post, clusterId } = await parseBody(req);
    if (!clusterId) {
      return NextResponse.json(
        { ok: false, error: "clusterId is required (Post.clusterId is non-null in schema)" },
        { status: 400 }
      );
    }

    const cluster = await db.cluster.findUnique({ where: { id: clusterId } });
    if (!cluster) {
      return NextResponse.json({ ok: false, error: `Cluster not found: ${clusterId}` }, { status: 404 });
    }

    const parentId = await resolveParentId(post.parent_slug ?? undefined);
    const meta = buildMeta(post);

    // NEW: map type + outlineStatus + parentSlug
    const prismaType = post.type.toUpperCase() === "PILLAR" ? "PILLAR" : "SUPPORTING";
    const outlineStatus = "READY"; // outline arrived
    const parentSlug = post.parent_slug ?? null;

    const existing = await db.post.findUnique({ where: { slug: post.slug } });

    const data = {
      title: post.title,
      slug: post.slug,
      type: prismaType as "PILLAR" | "SUPPORTING",
      parentId: parentId,
      parentSlug: parentSlug,
      outline: post.outline as any,
      outlineStatus: outlineStatus as "READY", // enum in schema
      content: existing?.content ?? "",
      status: "READY" as const,
      meta: meta as any,
      updatedAt: new Date(),
    };

    const saved = existing
      ? await db.post.update({ where: { id: existing.id }, data })
      : await db.post.create({ data: { ...data, clusterId, createdAt: new Date() } });

    return NextResponse.json({ ok: true, postId: saved.id, slug: saved.slug });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err?.message ?? "Unknown error" }, { status: 400 });
  }
}