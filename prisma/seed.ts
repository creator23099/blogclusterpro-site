import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function main() {
  // Demo user
  const user = await prisma.user.upsert({
    where: { email: 'demo@demo.com' },
    update: {},
    create: {
      email: 'demo@demo.com',
      clerkId: 'clerk_demo_123',
    },
  })

  // Demo cluster
  const cluster = await prisma.cluster.create({
    data: {
      userId: user.id,
      title: 'Chiropractic Blog Cluster',
      niche: 'chiropractic',
      status: 'READY',
      posts: {
        create: [
          {
            title: 'Best Treatments for Back Pain',
            slug: 'back-pain-treatments',
            content: '# Markdown body here',
            status: 'PUBLISHED',
          },
        ],
      },
    },
  })

  console.log({ user, cluster })
}

main()
  .then(() => prisma.$disconnect())
  .catch(e => {
    console.error(e)
    prisma.$disconnect()
    process.exit(1)
  })