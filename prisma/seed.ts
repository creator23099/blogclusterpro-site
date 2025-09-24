// prisma/seed.ts
import { PrismaClient, ArticleType, OutlineStatus, DraftStatus, PostStatus } from '@prisma/client'
const prisma = new PrismaClient()

async function main() {
  const user = await prisma.user.upsert({
    where: { clerkId: 'clerk_demo_123' },
    update: {},
    create: { clerkId: 'clerk_demo_123', email: 'demo@demo.com' },
  })

  const cluster = await prisma.cluster.create({
    data: {
      userId: user.id,
      title: 'Sciatica & Chiropractic Cluster',
      niche: 'healthcare',
      status: 'READY',
    },
  })

  // PILLAR
  const pillar = await prisma.post.create({
    data: {
      clusterId: cluster.id,
      type: ArticleType.PILLAR,
      title: 'Comprehensive Guide to Chiropractic Care for Sciatica',
      slug: 'understanding-chiropractic-care-for-sciatica',
      parentSlug: null,
      outlineStatus: OutlineStatus.READY,
      outline: {
        h1: 'Chiropractic Care for Sciatica: Complete Guide',
        sections: [
          { heading: 'What is Sciatica?', purpose: 'Define the condition.', key_points: [] },
          { heading: 'How Chiropractic Helps', purpose: 'Mechanism & outcomes.', key_points: [] },
        ],
      },
      outlineMetadata: {
        target_word_count: 2000,
        seo_keywords: ['chiropractic care for sciatica'],
      },
      content: '# (empty draft for now)',
      draftStatus: DraftStatus.NONE,
      status: PostStatus.DRAFT,
    },
  })

  // SUPPORTINGS
  const sup1 = await prisma.post.create({
    data: {
      clusterId: cluster.id,
      type: ArticleType.SUPPORTING,
      parentId: pillar.id,
      parentSlug: pillar.slug,
      title: 'The Science Behind Chiropractic Adjustments for Sciatica Relief',
      slug: 'the-science-behind-chiropractic-adjustments-for-sciatica-relief',
      outlineStatus: OutlineStatus.READY,
      outline: {
        h1: 'The Science Behind Chiropractic Adjustments for Sciatica Relief',
        sections: [
          { heading: 'Mechanism of Adjustments', purpose: 'Explain how.', key_points: [] },
          { heading: 'Evidence & Outcomes', purpose: 'Summarize research.', key_points: [] },
        ],
      },
      outlineMetadata: { target_word_count: 1200, seo_keywords: ['spinal adjustments', 'nerve pain'] },
      content: '# (empty draft for now)',
      draftStatus: DraftStatus.NONE,
      status: PostStatus.DRAFT,
    },
  })

  const sup2 = await prisma.post.create({
    data: {
      clusterId: cluster.id,
      type: ArticleType.SUPPORTING,
      parentId: pillar.id,
      parentSlug: pillar.slug,
      title: 'Comparing Chiropractic and Traditional Treatments for Sciatica',
      slug: 'comparing-chiropractic-care-and-traditional-treatments-for-sciatica',
      outlineStatus: OutlineStatus.READY,
      outline: {
        h1: 'Chiropractic vs Traditional Sciatica Treatments',
        sections: [
          { heading: 'Conservative Care', purpose: 'PT, meds.', key_points: [] },
          { heading: 'When to Choose What', purpose: 'Decision guidance.', key_points: [] },
        ],
      },
      outlineMetadata: { target_word_count: 1200, seo_keywords: ['sciatica treatments'] },
      content: '# (empty draft for now)',
      draftStatus: DraftStatus.NONE,
      status: PostStatus.DRAFT,
    },
  })

  console.log({ user: user.id, cluster: cluster.id, pillar: pillar.slug, supportings: [sup1.slug, sup2.slug] })
}

main().finally(() => prisma.$disconnect())