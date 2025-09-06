// src/services/publishing.ts
import { db } from "@/lib/db";

/** Ensure a cluster exists for this user; return its id.
 *  If no title provided, falls back to "Unclustered".
 */
export async function ensureClusterId(opts: {
  dbUserId: string;
  title?: string;
  niche?: string;
}) {
  const title = (opts.title ?? "Unclustered").trim();

  // find-or-create (no compound unique required)
  const found = await db.cluster.findFirst({
    where: { userId: opts.dbUserId, title },
    select: { id: true },
  });
  if (found) return found.id;

  const created = await db.cluster.create({
    data: {
      userId: opts.dbUserId,
      title,
      niche: opts.niche ?? "",
      status: "DRAFT",
    },
    select: { id: true },
  });
  return created.id;
}

/** Create or update a single post under a cluster (defaults to "Unclustered").
 *  Also bumps monthly Usage("blogs") by 1.
 */
export async function createSinglePost(opts: {
  dbUserId: string;
  clusterTitle?: string;
  clusterNiche?: string;
  slug: string;
  title: string;
  content?: string;
  status?: "DRAFT" | "READY" | "PUBLISHED";
}) {
  const clusterId = await ensureClusterId({
    dbUserId: opts.dbUserId,
    title: opts.clusterTitle,
    niche: opts.clusterNiche,
  });

  // Upsert without requiring composite unique: check then create/update by id
  const existing = await db.post.findFirst({
    where: { clusterId, slug: opts.slug },
    select: { id: true },
  });

  if (!existing) {
    await db.post.create({
      data: {
        clusterId,
        slug: opts.slug,
        title: opts.title,
        content: opts.content ?? "",
        status: (opts.status as any) ?? "DRAFT",
      },
    });
  } else {
    await db.post.update({
      where: { id: existing.id },
      data: {
        title: opts.title,
        content: opts.content ?? "",
        status: (opts.status as any) ?? "DRAFT",
      },
    });
  }

  // bump monthly usage by 1
  const now = new Date();
  const periodKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  await db.usage.upsert({
    where: { userId_metric_periodKey: { userId: opts.dbUserId, metric: "blogs", periodKey } },
    create: { userId: opts.dbUserId, metric: "blogs", periodKey, amount: 1 },
    update: { amount: { increment: 1 } },
  });

  return { clusterId };
}

/** (For later) batch-create posts under a named cluster. */
export async function createClusterWithPosts(opts: {
  dbUserId: string;
  clusterTitle: string;
  clusterNiche?: string;
  posts: Array<{ slug: string; title: string; content?: string; status?: "DRAFT" | "READY" | "PUBLISHED" }>;
}) {
  const clusterId = await ensureClusterId({
    dbUserId: opts.dbUserId,
    title: opts.clusterTitle,
    niche: opts.clusterNiche,
  });

  let affected = 0;
  for (const p of opts.posts) {
    if (!p?.slug) continue;
    const existing = await db.post.findFirst({
      where: { clusterId, slug: p.slug },
      select: { id: true },
    });
    if (!existing) {
      await db.post.create({
        data: {
          clusterId,
          slug: p.slug,
          title: p.title,
          content: p.content ?? "",
          status: (p.status as any) ?? "DRAFT",
        },
      });
    } else {
      await db.post.update({
        where: { id: existing.id },
        data: {
          title: p.title,
          content: p.content ?? "",
          status: (p.status as any) ?? "DRAFT",
        },
      });
    }
    affected++;
  }

  if (affected > 0) {
    const now = new Date();
    const periodKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    await db.usage.upsert({
      where: { userId_metric_periodKey: { userId: opts.dbUserId, metric: "blogs", periodKey } },
      create: { userId: opts.dbUserId, metric: "blogs", periodKey, amount: affected },
      update: { amount: { increment: affected } },
    });
  }

  return { clusterId, postsAddedOrUpdated: affected };
}