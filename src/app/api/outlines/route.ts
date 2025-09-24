import { NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'

const Body = z.object({
  // identities
  id: z.string().optional(),               // optional (we use slug for upsert)
  slug: z.string(),
  title: z.string(),
  type: z.enum(['pillar', 'supporting']),
  // relationships (optional but helpful)
  clusterId: z.string().optional(),
  parent_slug: z.string().nullable().optional(),
  // outline payload
  outline: z.object({
    h1: z.string(),
    sections: z.array(z.object({
      heading: z.string(),
      purpose: z.string().optional().default(''),
      key_points: z.array(z.string()).optional().default([]),
      suggested_internal_links: z.array(z.object({
        slug: z.string(),
        anchor_text: z.string().optional().default('Read more'),
      })).optional().default([]),
      citation_placeholders: z.array(z.string()).optional().default([]),
    })),
  }),
  metadata: z.any().optional(),
  outline_status: z.string().optional().default('READY'),
  outline_generated_at: z.string().optional(),
})

/**
 * POST /api/outlines
 * Body: { slug, title, type, outline, metadata, parent_slug?, clusterId? }
 * Upserts Post + stores outline + marks status READY.
 */
export async function POST(req: Request) {
  const json = await req.json()
  const data = Body.parse(json)

  const post = await prisma.post.upsert({
    where: { slug: data.slug },
    create: {
      slug: data.slug,
      title: data.title,
      content: '', // draft will fill later
      status: 'READY',
      clusterId: data.clusterId ?? undefined,
      parentSlug: data.parent_slug ?? undefined,
      outline: data.outline as any,
      meta: data.metadata as any,
    },
    update: {
      title: data.title,
      status: 'READY',
      parentSlug: data.parent_slug ?? undefined,
      outline: data.outline as any,
      meta: data.metadata as any,
    },
    select: { id: true, slug: true, title: true, status: true },
  })

  return NextResponse.json({ ok: true, post })
}