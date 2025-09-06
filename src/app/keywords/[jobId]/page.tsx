// src/app/keywords/[jobId]/page.tsx
import { auth } from "@clerk/nextjs/server";
import { notFound } from "next/navigation";
import Link from "@/components/Link";
import { db } from "@/lib/db";
import AutoRefresh from "./refresh-client";

type Params = { jobId: string };

export default async function KeywordJobPage({
  params,
}: { params: Promise<Params> }) {
  // Next 15: params is a Promise
  const { jobId } = await params;

  const isDev = process.env.NODE_ENV !== "production";
  const { userId, sessionId } = auth();

  // --- Debug so we know what's happening on the server while using the tunnel ---
  if (isDev) {
    console.log("[JOB PAGE] auth()", {
      userId: userId ? userId.slice(0, 10) + "…" : null,
      sessionId: sessionId ? sessionId.slice(0, 10) + "…" : null,
      jobId,
    });
  }

  // Try fetching the job first
  const job = await db.keywordsJob.findUnique({
    where: { id: jobId },
    include: {
      suggestions: { orderBy: { createdAt: "desc" }, take: 200 },
    },
  });

  // If no job at all, 404
  if (!job) {
    if (isDev) console.log("[JOB PAGE] no job found", { jobId });
    notFound();
  }

  // In production, enforce owner. In dev (tunnel), relax this so we can view.
  if (!isDev) {
    if (!userId || job.userId !== userId) {
      notFound();
    }
  }

  const hasResults = job.suggestions.length > 0;
  const isDone = job.status === "READY" || job.status === "FAILED";

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">
          Keyword Job: <span className="font-mono">{job.id}</span>
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

      <div className="rounded border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50">
            <tr>
              <th className="text-left p-2">Keyword</th>
              <th className="text-left p-2">Score</th>
              <th className="text-left p-2">Source</th>
              <th className="text-left p-2">News</th>
              <th className="text-left p-2">Created</th>
            </tr>
          </thead>
          <tbody>
            {hasResults ? (
              job.suggestions.map((s) => (
                <tr key={s.id} className="border-t">
                  <td className="p-2">{s.keyword}</td>
                  <td className="p-2">{s.score ?? "—"}</td>
                  <td className="p-2">
                    {s.sourceUrl ? (
                      <a
                        href={s.sourceUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-blue-600 underline"
                      >
                        open
                      </a>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="p-2">
                    {Array.isArray(s.newsUrls) && s.newsUrls.length ? (
                      <div className="flex flex-col gap-1">
                        {(s.newsUrls as unknown as string[]).slice(0, 3).map((u, i) => (
                          <a
                            key={i}
                            href={u}
                            target="_blank"
                            rel="noreferrer"
                            className="text-blue-600 underline truncate max-w-[260px]"
                            title={u}
                          >
                            {u}
                          </a>
                        ))}
                      </div>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="p-2">
                    {new Date(s.createdAt).toLocaleString()}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td className="p-3 text-slate-500" colSpan={5}>
                  No suggestions yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Auto-refresh every 5s until results or job completes */}
      <AutoRefresh enabled={!isDone && !hasResults} intervalMs={5000} maxMs={120000} />
    </div>
  );
}