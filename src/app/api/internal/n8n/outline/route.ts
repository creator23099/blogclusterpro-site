import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/src/lib/prisma';

/** ---------- Auth ---------- */
function requireInternalKey(req: NextRequest) {
  const key = req.headers.get('x-internal-key') || req.headers.get('X-Internal-Key');
  if (!key || key !== process.env.INTERNAL_API_KEY) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  }
  return null;
}

/** ---------- Schemas ---------- */
// Your parse-outline flat shape
const FlatOutlineSchema = z.object({
  id: z.string().optional(),
  slug: z.string().min(1),
  type: z.enum(['pillar', 'supporting']),
  title: z.string().min(1),
  outline: z.object({
    h1: z.string().optional(),
    sections: z.array(
      z.object({
        heading: z.string().min(1),
        purpose: z.string().optional().default(''),
        key_points: z.array(z.string()).optional().default([]),
        suggested_internal_links: z
          .array(z.object({ slug: z.string(), anchor_text: z.string() }))
          .optional()
          .default([]),
        citation_placeholders: z.array(z.string()).optional().default([]),
      }),
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
          }),
        )
        .optional(),
    })
    .optional()
    .default({}),
  parent_slug: z.string().optional().nullable(),
  clusterId: z.string().optional(), // strongly recommended
});

// Alternative nested shape: { post: {...same as above...}, clusterId }
const NestedPayloadSchema = z.object({
  clusterId: z.string().optional(),
  post: FlatOutlineSchema.partial({ clusterId: true }),
});

type FlatOutline = z.infer<typeof FlatOutlineSchema>;

/** Normalize either shape into FlatOutline + ensured clusterId */
async function parseBody(req: NextRequest): Promise<{ post: FlatOutline; clusterId?: string }> {
  const json = await req.json();

  // Try nested first
  const nested = NestedPayloadSchema.safeParse(json);
  if (nested.success) {
    return {
      post: {
        ...nested.data.post,
        clusterId: nested.data.clusterId ?? nested.data.post.clusterId,
      } as FlatOutline,
      clusterId: nested.data.clusterId ?? nested.data.post.clusterId,
    };
  }

  // Fall back to flat
  const flat = FlatOutlineSchema.safeParse(json);
  if (!flat.success) {
    throw new Error(`Invalid payload: ${flat.error.message}`);
  }
  return { post: flat.data, clusterId: flat.data.clusterId };
}

/** ---------- Helpers ---------- */
async function resolveParentId(parentSlug?: string | null) {
  if (!parentSlug) return null;
  const parent = await prisma.post.findUnique({ where: { slug: parentSlug } });
  return parent?.id ?? null;
}

/** Build meta we want to keep handy without bloating Post columns */
function buildMeta(post: FlatOutline) {
  const { metadata = {}, type } = post;
  return {
    ...(metadata ?? {}),
    type,
    // You can add more rollups later (e.g., counts of sections, first-links, etc.)
  };
}

/** ---------- Routes ---------- */

export async function GET() {
  // Simple healthcheck
  return NextResponse.json({ ok: true, route: 'outline', requires: ['X-Internal-Key', 'clusterId', 'slug'] });
}

export async function POST(req: NextRequest) {
  // 1) Auth
  const unauth = requireInternalKey(req);
  if (unauth) return unauth;

  try {
    // 2) Parse & validate
    const { post, clusterId } = await parseBody(req);
    if (!clusterId) {
      return NextResponse.json(
        { ok: false, error: 'clusterId is required (Post.clusterId is non-null in schema)' },
        { status: 400 },
      );
    }

    // 3) Ensure Cluster exists
    const cluster = await prisma.cluster.findUnique({ where: { id: clusterId } });
    if (!cluster) {
      return NextResponse.json({ ok: false, error: `Cluster not found: ${clusterId}` }, { status: 404 });
    }

    // 4) Resolve parentId from parent_slug (if present)
    const parentId = await resolveParentId(post.parent_slug ?? undefined);

    // 5) Upsert Post by slug
    const meta = buildMeta(post);

    const existing = await prisma.post.findUnique({ where: { slug: post.slug } });

    const data = {
      title: post.title,
      slug: post.slug,
      content: existing?.content ?? '', // keep content if any; empty if new
      status: 'READY' as const,
      outline: post.outline as any,
      meta: meta as any,
      parentId: parentId ?? null,
      updatedAt: new Date(),
    };

    const saved = existing
      ? await prisma.post.update({
          where: { id: existing.id },
          data,
        })
      : await prisma.post.create({
          data: {
            ...data,
            clusterId,
            createdAt: new Date(),
          },
        });

    return NextResponse.json({ ok: true, postId: saved.id, slug: saved.slug });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err?.message ?? 'Unknown error' }, { status: 400 });
  }
}