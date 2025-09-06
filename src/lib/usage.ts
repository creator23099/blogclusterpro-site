// src/lib/usage.ts
import { db } from "@/lib/db";

/**
 * Period key helper, e.g. "2025-09" (monthly buckets).
 * Adjust if you want weekly/daily.
 */
export function currentPeriodKey(date = new Date()): string {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

type IncrementArgs = {
  userId: string;
  metric: string;      // e.g. "research", "keywords", "publish"
  amount?: number;     // default 1
};

/**
 * Increment usage counter for (userId, metric, periodKey).
 * Relies on a unique composite index on (userId, metric, periodKey).
 */
export async function incrementUsage({ userId, metric, amount = 1 }: IncrementArgs) {
  const periodKey = currentPeriodKey();

  await db.usage.upsert({
    where: {
      userId_metric_periodKey: {
        userId,
        metric,
        periodKey,
      },
    },
    update: {
      amount: { increment: amount },
      updatedAt: new Date(),
    },
    create: {
      userId,
      metric,
      periodKey,
      amount,
    },
  });
}

/** Optional helper if you need to read a user’s usage */
export async function getUsage(userId: string, metric: string) {
  const periodKey = currentPeriodKey();
  return db.usage.findUnique({
    where: {
      userId_metric_periodKey: { userId, metric, periodKey },
    },
  });
}