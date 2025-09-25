import { NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'

const Body = z.object({
  slug: z.string(),
  title: z.string().optional(),
  content: z.string(),                    // full Markdown
  status: z.enum(['DRAFT', 'READY', 'PUBLISHED']).default('READY'),
  meta: z.any().optional(),               // { title, description, ... }
  citations: z.array(z.string()).optional().default([]), // list of URLs/refs
})

/**
 * POST /api/drafts
 * Body: { slug, content, status?, meta?, citations? }
 * Updates the post with the final draft content.
 */
export async function POST(req: Request) {
  const json = await req.json()
  const data = Body.parse(json)

  const updated = await prisma.post.update({
    where: { slug: data.slug },
    data: {
      ...(data.title ? { title: data.title } : {}),
      content: data.content,
      status: data.status,
      meta: data.meta as any,
      citations: data.citations as any,
    },
    select: { id: true, slug: true, status: true },
  })

  return NextResponse.json({ ok: true, post: updated })
}