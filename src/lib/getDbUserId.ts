// src/lib/getDbUserId.ts
import { db } from "@/lib/db";

export async function getDbUserIdFromClerk(clerkUserId: string, email?: string | null) {
  const user = await db.user.upsert({
    where: { clerkId: clerkUserId },
    create: { clerkId: clerkUserId, email: email ?? null },
    update: {},
    select: { id: true },
  });
  return user.id; // internal cuid used by all FK relations
}