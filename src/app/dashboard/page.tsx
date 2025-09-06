// src/app/dashboard/page.tsx
import { auth, currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import Link from "@/components/Link";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import { db } from "@/lib/db";
import ManageBillingButton from "@/components/ManageBillingButton";
import HowItWorksButton from "@/components/HowItWorksButton"; // ⬅️ popover trigger

export const dynamic = "force-dynamic";
dayjs.extend(relativeTime);

const PLAN_LIMITS: Record<string, { label: string; blogsPerMonth: number }> = {
  ...(process.env.STRIPE_PRICE_STARTER ? { [process.env.STRIPE_PRICE_STARTER]: { label: "Starter", blogsPerMonth: 8 } } : {}),
  ...(process.env.STRIPE_PRICE_PRO ? { [process.env.STRIPE_PRICE_PRO]: { label: "Pro", blogsPerMonth: 30 } } : {}),
  ...(process.env.STRIPE_PRICE_AGENCY ? { [process.env.STRIPE_PRICE_AGENCY]: { label: "Authority", blogsPerMonth: 60 } } : {}),
  ...(process.env.STRIPE_PRICE_BYOK ? { [process.env.STRIPE_PRICE_BYOK]: { label: "BYOK", blogsPerMonth: 0 } } : {}),
};

function prettyPlan(priceId?: string) {
  if (!priceId) return { label: "—", blogsPerMonth: 0 };
  return PLAN_LIMITS[priceId] ?? { label: "Custom", blogsPerMonth: 0 };
}

function UsageRing({ used, max, size = 84 }: { used: number; max: number; size?: number }) {
  const pct = Math.max(0, Math.min(100, max > 0 ? (used / max) * 100 : 0));
  const radius = (size - 10) / 2;
  const C = 2 * Math.PI * radius;
  const dash = (pct / 100) * C;
  const tone = pct < 70 ? "stroke-emerald-500" : pct < 100 ? "stroke-amber-500" : "stroke-rose-500";

  return (
    <div className="relative inline-flex items-center justify-center" aria-label="Monthly blog usage">
      <svg width={size} height={size} className="transform -rotate-90">
        <circle cx={size/2} cy={size/2} r={radius} className="stroke-slate-200/70" strokeWidth="10" fill="none" />
        <circle
          cx={size/2} cy={size/2} r={radius}
          className={`${tone} transition-all duration-700 ease-out`}
          strokeWidth="10" strokeLinecap="round" fill="none"
          strokeDasharray={`${dash} ${C - dash}`}
        />
      </svg>
      <div className="absolute text-center">
        <span className="block text-[10px] font-medium text-slate-500">Used</span>
        <span className="text-base font-semibold text-slate-900">{used}</span>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status?: string }) {
  const style =
    status === "active" || status === "trialing"
      ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200"
      : status === "incomplete" || status === "past_due"
      ? "bg-amber-50 text-amber-700 ring-1 ring-amber-200"
      : "bg-slate-50 text-slate-600 ring-1 ring-slate-200";
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${style}`}>
      {status ?? "unknown"}
    </span>
  );
}

export default async function DashboardPage() {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const user = await currentUser().catch(() => null);
  const firstName = user?.firstName ?? "friend";
  const email =
    user?.emailAddresses?.[0]?.emailAddress ??
    user?.primaryEmailAddress?.emailAddress ??
    "";
  const avatar = (user as any)?.imageUrl || "";

  let sub: Awaited<ReturnType<typeof db.subscription.findUnique>> | null = null;
  try { sub = await db.subscription.findUnique({ where: { userId } }); } catch {}

  const periodKey = dayjs().format("YYYY-MM");
  let blogUsage: Awaited<ReturnType<typeof db.usage.findUnique>> | null = null;
  try {
    blogUsage = await db.usage.findUnique({
      where: { userId_metric_periodKey: { userId, metric: "blogs", periodKey } },
    });
  } catch {}

  let clusters:
    | Array<
        Awaited<ReturnType<typeof db.cluster.findMany>>[number] & {
          posts: Awaited<ReturnType<typeof db.cluster.findMany>>[number]["posts"];
        }
      >
    | [] = [];
  try {
    clusters = await db.cluster.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      include: { posts: { orderBy: { updatedAt: "desc" } } },
    });
  } catch {}

  const { label: planLabel, blogsPerMonth } = prettyPlan(sub?.stripePriceId);
  const renewsOn = sub?.currentPeriodEnd ? dayjs(sub.currentPeriodEnd).format("MMM D, YYYY") : "—";
  const used = blogUsage?.amount ?? 0;

  return (
    <main className="relative isolate">
      {/* Ambient background */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute -top-24 -left-24 h-72 w-72 rounded-full bg-gradient-to-br from-sky-300/30 via-indigo-300/20 to-emerald-300/20 blur-3xl" />
        <div className="absolute -bottom-24 -right-24 h-80 w-80 rounded-full bg-gradient-to-tr from-rose-300/20 via-amber-300/20 to-fuchsia-300/20 blur-3xl" />
      </div>

      {/* HERO */}
      <section className="relative mx-auto max-w-6xl px-6 pt-8">
        <div className="rounded-3xl border border-white/40 bg-white/60 p-5 shadow-[0_10px_40px_-20px_rgba(2,6,23,0.25)] backdrop-blur">
          <div className="flex items-center gap-4">
            {avatar ? (
              <img
                src={avatar}
                alt={`${firstName} avatar`}
                className="h-12 w-12 rounded-full ring-2 ring-white/60 shadow-md"
              />
            ) : (
              <div className="h-12 w-12 rounded-full bg-slate-200 ring-2 ring-white/60" />
            )}
            <div>
              <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
                Welcome back, {firstName} 👋
              </h1>
              <p className="text-sm text-slate-600">{email || " "}</p>
            </div>

            {/* BLUE PILLS + How it works */}
            <div className="ml-auto flex items-center gap-3">
              {/* Start flow at /research */}
              <Link
                href="/research"
                className="inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold shadow-lg transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
                style={{ backgroundColor: '#2563eb', color: '#ffffff' }}
              >
                <span className="inline-block h-1.5 w-1.5 rounded-full bg-white/80" />
                Start Creating
              </Link>
              {/* Keep Upgrade to pricing */}
              <Link
                href="/pricing"
                className="inline-flex items-center rounded-xl px-4 py-2 text-sm font-semibold shadow-lg transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
                style={{ backgroundColor: '#2563eb', color: '#ffffff' }}
              >
                Upgrade
              </Link>

              {/* Thought-bubble trigger (outline) */}
              <HowItWorksButton variant="outline" className="hidden sm:inline-flex" />
            </div>
          </div>

          {/* STATS STRIP */}
          <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {/* Plan */}
            <div className="group rounded-2xl border border-white/40 bg-white/70 p-4 backdrop-blur transition hover:shadow-md hover:-translate-y-0.5">
              <div className="flex items-center justify-between">
                <p className="text-[11px] uppercase tracking-wide text-slate-500">Plan</p>
                <StatusBadge status={sub?.status} />
              </div>
              <p className="mt-1 text-lg font-semibold text-slate-900">{planLabel}</p>
              <p className="text-xs text-slate-500">Renews {renewsOn}</p>
              {sub?.stripeCustomerId && (
                <div className="mt-3">
                  <ManageBillingButton customerId={sub.stripeCustomerId} />
                </div>
              )}
            </div>

            {/* Usage */}
            <div className="group flex items-center gap-4 rounded-2xl border border-white/40 bg-white/70 p-4 backdrop-blur transition hover:shadow-md hover:-translate-y-0.5">
              <UsageRing used={used} max={blogsPerMonth} />
              <div>
                <p className="text-[11px] uppercase tracking-wide text-slate-500">Blogs this month</p>
                <p className="mt-1 text-lg font-semibold text-slate-900">
                  {blogsPerMonth > 0 ? `${used} / ${blogsPerMonth}` : `${used} / —`}
                </p>
                <p className="text-xs text-slate-500">
                  {blogsPerMonth > 0
                    ? `${Math.min(100, Math.round((used / blogsPerMonth) * 100))}% of plan`
                    : "Usage-billed"}
                </p>
              </div>
            </div>

            {/* Clusters */}
            <div className="rounded-2xl border border-white/40 bg-white/70 p-4 backdrop-blur transition hover:shadow-md hover:-translate-y-0.5">
              <p className="text-[11px] uppercase tracking-wide text-slate-500">CLUSTERS</p>
              <p className="mt-1 text-3xl font-semibold text-slate-900">{clusters.length}</p>
              <p className="text-xs text-slate-500">Active collections</p>
            </div>

            {/* Research tile → /research */}
            <Link
              href="/research"
              className="rounded-2xl border border-white/40 bg-gradient-to-br from-white/70 to-white/50 p-4 backdrop-blur transition hover:shadow-md hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-300"
            >
              <p className="text-[11px] uppercase tracking-wide text-slate-500">RESEARCH</p>
              <p className="mt-1 text-lg font-semibold text-slate-900">Find Trending Topics</p>
              <p className="text-xs text-slate-500">News-backed ideas & sources</p>
            </Link>
          </div>
        </div>
      </section>

      {/* BODY */}
      <section className="relative mx-auto max-w-6xl px-6 py-8">
        {!sub?.stripeCustomerId && (
          <div className="mb-6 rounded-2xl border border-white/40 bg-white/80 p-5 shadow-sm backdrop-blur">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-slate-700">
                No active subscription found. Unlock higher limits & features.
              </p>
              <Link
                href="/pricing"
                className="inline-flex items-center justify-center rounded-md px-3 py-1.5 text-sm font-semibold shadow-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
                style={{ backgroundColor: '#2563eb', color: '#ffffff' }}
              >
                Choose a plan
              </Link>
            </div>
          </div>
        )}

        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900">Your clusters</h2>
          <div className="flex items-center gap-2">
            <Link
              href="/clusters/new"
              className="inline-flex items-center justify-center rounded-md px-3 py-1.5 text-sm font-semibold shadow-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
              style={{ backgroundColor: '#2563eb', color: '#ffffff' }}
            >
              New cluster
            </Link>
            <Link
              href="/research"
              className="inline-flex items-center justify-center rounded-md border border-slate-200 bg-white px-3 py-1.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-300"
            >
              Explore research
            </Link>
          </div>
        </div>

        {clusters.length === 0 ? (
          <div className="rounded-2xl border-2 border-dashed border-slate-300 bg-white/80 p-8 text-center backdrop-blur">
            <p className="text-sm font-medium text-slate-900">No clusters yet</p>
            <p className="mt-1 text-sm text-slate-600">
              Kickstart your SEO by grouping related posts into a cluster.
            </p>
            <div className="mt-4 flex items-center justify-center gap-3">
              <Link
                href="/clusters/new"
                className="inline-flex items-center justify-center rounded-md px-3 py-1.5 text-sm font-semibold shadow-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
                style={{ backgroundColor: '#2563eb', color: '#ffffff' }}
              >
                Create your first cluster
              </Link>

              {/* Thought-bubble trigger (blue) */}
              <HowItWorksButton variant="blue" />
            </div>
          </div>
        ) : (
          <div className="grid gap-5 md:grid-cols-2">
            {clusters.map((c) => {
              const recent = c.posts.slice(0, 4);
              return (
                <div
                  key={c.id}
                  className="group rounded-2xl border border-white/40 bg-white/90 p-5 shadow-sm backdrop-blur transition hover:shadow-md hover:-translate-y-0.5"
                >
                  <div className="flex items-start justify-between">
                    <div className="min-w-0">
                      <h3 className="truncate text-base font-semibold text-slate-900 group-hover:text-blue-600 transition-colors">
                        {c.title}
                      </h3>
                      <p className="text-xs text-slate-500">{c.niche}</p>
                    </div>
                    <span className="rounded-full bg-slate-50 px-2 py-0.5 text-xs font-medium text-slate-600 ring-1 ring-slate-200">
                      {(c.status ?? "DRAFT").toLowerCase()}
                    </span>
                  </div>

                  <div className="mt-4">
                    <p className="text-xs font-medium text-slate-700">Recent posts</p>
                    {recent.length === 0 ? (
                      <p className="mt-1 text-sm text-slate-600">No posts yet.</p>
                    ) : (
                      <ul className="mt-2 space-y-2">
                        {recent.map((p) => (
                          <li
                            key={p.id}
                            className="flex items-center justify-between gap-2 rounded-lg border border-transparent p-2 transition hover:border-slate-200 hover:bg-slate-50 focus-within:ring-1 focus-within:ring-slate-300"
                          >
                            <div className="min-w-0">
                              <p className="truncate text-sm font-medium text-slate-900">{p.title}</p>
                              <p className="text-xs text-slate-500">
                                {p.status.toLowerCase()} · updated {dayjs(p.updatedAt).fromNow()}
                              </p>
                            </div>
                            <Link
                              href={`/posts/${p.slug}`}
                              className="shrink-0 rounded-md px-2 py-1 text-xs font-semibold text-blue-600 underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40"
                            >
                              Open
                            </Link>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>

                  <div className="mt-4 flex items-center justify-end gap-2">
                    <Link
                      href={`/research?clusterId=${encodeURIComponent(c.id)}`}
                      className="rounded-md border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-300"
                    >
                      Research
                    </Link>
                    <Link
                      href={`/clusters/${c.id}`}
                      className="text-xs font-semibold text-slate-700 underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-300 rounded"
                    >
                      View cluster →
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Floating quick action — BLUE */}
      <Link
        href="/research"
        className="fixed bottom-6 right-6 inline-flex h-12 items-center gap-2 rounded-full px-5 text-sm font-semibold shadow-xl transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
        style={{ backgroundColor: '#2563eb', color: '#ffffff' }}
        aria-label="Start research"
      >
        ✨ Start Research
      </Link>
    </main>
  );
}