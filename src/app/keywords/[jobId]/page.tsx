// src/app/keywords/[jobId]/page.tsx
import { auth } from "@clerk/nextjs/server";
import { notFound } from "next/navigation";
import Link from "@/components/Link";
import { db } from "@/lib/db";
import ResultsClient from "./ResultsClient";   // client component
import AutoRefresh from "./refresh-client";    // client component

type Params = { jobId: string };

export default async function KeywordJobPage({
  params,
}: { params: Promise<Params> }) {
  const { jobId } = await params;

  const isDev = process.env.NODE_ENV !== "production";
  const { userId } = await auth();

  // Fetch job + suggestions from DB
  const job = await db.keywordsJob.findUnique({
    where: { id: jobId },
    include: {
      suggestions: { orderBy: { createdAt: "desc" }, take: 200 },
    },
  });

  if (!job) notFound();
  if (!isDev && (!userId || job.userId !== userId)) notFound();

  const hasResults = job.suggestions.length > 0;
  const isDone = job.status === "READY" || job.status === "FAILED";

  // Serialize to plain JSON for client boundary
  const suggestions = job.suggestions.map((s) => ({
    id: s.id,
    keyword: s.keyword,
    score: s.score ?? null,
    newsUrls: Array.isArray(s.newsUrls) ? (s.newsUrls as unknown as string[]) : [],
    newsMeta: Array.isArray(s.newsMeta) ? (s.newsMeta as unknown as any[]) : [],
    createdAt:
      s.createdAt instanceof Date ? s.createdAt.toISOString() : String(s.createdAt),
  }));

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">
          Keyword Job: <span className="font-mono">{job.id}</span>
        </h1>
        <span className="text-xs px-2 py-1 rounded bg-slate-100">{job.status}</span>
      </div>

      <p className="text-sm text-slate-600">
        Topic: {job.topic ?? "—"} · Country: {job.country ?? "—"} · Region:{" "}
        {job.region ?? "—"}
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

      {/* Client table with expandable summaries */}
      <ResultsClient hasResults={hasResults} suggestions={suggestions} />

      {/* Auto-refresh until done or results appear */}
      <AutoRefresh enabled={!isDone && !hasResults} intervalMs={5000} maxMs={120000} />
    </div>
  );
}