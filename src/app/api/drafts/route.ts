import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

const Body = z.object({
  slug: z.string(),
  title: z.string().optional(),
  content: z.string(), // full Markdown
  status: z.enum(["DRAFT", "READY", "PUBLISHED"]).default("READY"),
  meta: z.any().optional(), // { title, description, ... }
  citations: z.array(z.string()).optional().default([]), // list of URLs/refs
  seoTitle: z.string().optional(),
  seoDesc: z.string().optional(),
  summary: z.string().optional(),
});

/**
 * POST /api/drafts
 * Body: { slug, content, status?, meta?, citations?, seoTitle?, seoDesc?, summary? }
 * Updates the post with the final draft content.
 */
export async function POST(req: Request) {
  try {
    const json = await req.json();
    const data = Body.parse(json);

    const updated = await prisma.post.update({
      where: { slug: data.slug },
      data: {
        ...(data.title ? { title: data.title } : {}),
        content: data.content,
        status: data.status,
        meta: {
          ...(data.meta ?? {}),
          seo_title: data.seoTitle ?? data.meta?.seo_title ?? null,
          meta_description: data.seoDesc ?? data.meta?.meta_description ?? null,
          summary: data.summary ?? data.meta?.summary ?? null,
        },
        citations: data.citations as any,
      },
      select: { id: true, slug: true, status: true },
    });

    return NextResponse.json({ ok: true, post: updated });
  } catch (error: any) {
    console.error("Error updating draft:", error);
    return NextResponse.json(
      { ok: false, error: error.message || "Failed to update draft" },
      { status: 500 }
    );
  }
}