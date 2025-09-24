import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

/**
 * GET /api/posts/supportings?parent_slug=slug-here&status=READY
 * Returns: [{ id, slug, title, outline }]
 */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const parentSlug = searchParams.get('parent_slug')
  const status = searchParams.get('status') ?? undefined

  if (!parentSlug) {
    return NextResponse.json({ error: 'parent_slug is required' }, { status: 400 })
  }

  const posts = await prisma.post.findMany({
    where: {
      parentSlug,
      ...(status ? { status } : {}),
    },
    select: { id: true, slug: true, title: true, outline: true },
    orderBy: { createdAt: 'asc' },
  })

  return NextResponse.json(posts)
}