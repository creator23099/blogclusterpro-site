// src/lib/planLimits.ts
export const PLAN_LIMITS = {
  starter: { blogsPerMonth: 8, clusters: 0, seats: 1 },
  pro:     { blogsPerMonth: 30, clusters: 10, seats: 3 },
  agency:  { blogsPerMonth: 120, clusters: 30, seats: 10 },
  byok:    { blogsPerMonth: 9999, clusters: 9999, seats: 20 }, // you’ll gate by usage anyway
} as const;

export type PlanKey = keyof typeof PLAN_LIMITS;