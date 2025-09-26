// src/app/keywords/[jobId]/page.tsx
import { auth } from "@clerk/nextjs/server";
import { notFound } from "next/navigation";
import Link from "@/components/Link";
import { db } from "@/lib/db";
import AutoRefresh from "./refresh-client";

type Params = { jobId: string };

// Small helper: friendlier publisher label from URL
function brandFromUrl(url?: string | null) {
  if (!url) return null;
  try {
    const h = new URL(url).hostname.replace(/^www\./, "");
    const parts = h.split(".");
    return parts.length >= 2 ? parts[parts.length - 2] : h;
  } catch {
    return null;
  }
}

export default async function KeywordJobPage({
  params,
}: { params: Promise<Params> }) {
  const { jobId } = await params;

  const isDev = process.env.NODE_ENV !== "production";
  const { userId } = await auth();

  // ---- Job (for ownership + header) ----
  const job = await db.keywordsJob.findUnique({ where: { id: jobId } });
  if (!job) notFound();
  if (!isDev && (!userId || job.userId !== userId)) notFound();

  // ---- Only what we need: articles + topic suggestions ----
  const [articles, topicRows] = await Promise.all([
    db.researchArticle.findMany({
      where: { jobId },
      orderBy: [{ rank: "asc" }, { publishedTime: "desc" }],
      take: 5,
      select: {
        id: true,
        url: true,
        title: true,
        sourceName: true,
        publishedTime: true,
        snippet: true,
      },
    }),
    db.researchTopicSuggestion.findMany({
      where: { jobId },
      orderBy: { label: "asc" },
      select: { label: true, tier: true }, // tier: 'top' | 'rising' | 'all'
    }),
  ]);

  const isDone = job.status === "READY" || job.status === "FAILED";
  const hasResults = articles.length > 0 || topicRows.length > 0;

  const topics = {
    top: topicRows.filter((t) => t.tier === "top").map((t) => t.label),
    rising: topicRows.filter((t) => t.tier === "rising").map((t) => t.label),
    all: topicRows.filter((t) => t.tier === "all").map((t) => t.label),
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">
          Research Report: <span className="font-mono">{job.id}</span>
        </h1>
        <span className="text-xs px-2 py-1 rounded bg-slate-100">{job.status}</span>
      </div>

      <p className="text-sm text-slate-600">
        Topic: {job.topic ?? "—"} · Country: {job.country ?? "—"} · Region: {job.region ?? "—"}
      </p>

      <div className="flex items-center gap-3">
        <Link href="/research" className="text-blue-600 underline text-sm">
          ← Back to Research
        </Link>
      </div>

      {!isDone && (
        <div className="rounded border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
          Waiting for results… this page auto-refreshes every 5s.
        </div>
      )}

      {/* =================== NEWS ARTICLES =================== */}
      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Top News Articles</h2>
        <ul className="divide-y divide-slate-200 rounded-md border">
          {articles.map((a) => {
            const source =
              (a.sourceName && a.sourceName !== "unknown_source" ? a.sourceName : null) ||
              brandFromUrl(a.url) ||
              "—";
            return (
              <li key={a.id} className="p-4 space-y-1">
                <div className="text-sm font-medium text-slate-900">
                  {a.url ? (
                    <a
                      href={a.url}
                      target="_blank"
                      rel="noreferrer"
                      className="underline decoration-slate-300 hover:decoration-slate-500"
                    >
                      {a.title || a.url}
                    </a>
                  ) : (
                    a.title || "Untitled"
                  )}
                </div>
                <div className="text-xs text-slate-500">
                  {source}
                  {a.publishedTime ? ` • ${new Date(a.publishedTime).toLocaleString()}` : ""}
                </div>
                {a.snippet && a.snippet.trim() ? (
                  <details className="mt-1">
                    <summary className="cursor-pointer text-xs text-blue-700">Summary</summary>
                    <p className="mt-1 text-xs text-slate-700">{a.snippet}</p>
                  </details>
                ) : null}
              </li>
            );
          })}
          {articles.length === 0 && (
            <li className="p-4 text-sm text-slate-500">No articles found (yet).</li>
          )}
        </ul>
      </section>

      {/* =================== SUPPORTING BLOG TOPICS =================== */}
      <section className="space-y-2">
        <h2 className="text-lg font-semibold">Supporting Blog Topics</h2>
        {(["top", "rising", "all"] as const).map((tier) => (
          <div key={tier} className="space-y-1">
            <div className="text-xs font-semibold text-slate-500">{tier.toUpperCase()}</div>
            <div className="flex flex-wrap gap-2">
              {topics[tier].length ? (
                topics[tier].map((label) => (
                  <span
                    key={`${tier}:${label}`}
                    className="rounded-full border border-slate-300 px-3 py-1 text-sm"
                    title={label}
                  >
                    {label}
                  </span>
                ))
              ) : (
                <span className="text-xs text-slate-400">None</span>
              )}
            </div>
          </div>
        ))}
      </section>

      {/* Auto-refresh until done or results appear */}
      <AutoRefresh enabled={!isDone && !hasResults} intervalMs={5000} maxMs={120000} />
    </div>
  );
}