// src/app/keywords/[jobId]/page.tsx
"use client";

import { auth } from "@clerk/nextjs/server";
import { notFound } from "next/navigation";
import Link from "@/components/Link";
import { db } from "@/lib/db";
import AutoRefresh from "./refresh-client";
import { useState } from "react";

type Params = { jobId: string };

export default async function KeywordJobPage({
  params,
}: { params: Promise<Params> }) {
  const { jobId } = await params;

  const isDev = process.env.NODE_ENV !== "production";
  const { userId } = await auth(); // ✅ FIX

  if (isDev) {
    console.log("[JOB PAGE]", { userId, jobId });
  }

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

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">
          Keyword Job: <span className="font-mono">{job.id}</span>
        </h1>
        <span className="text-xs px-2 py-1 rounded bg-slate-100">
          {job.status}
        </span>
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

      <div className="rounded border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50">
            <tr>
              <th className="text-left p-2">Keyword</th>
              <th className="text-left p-2">Score</th>
              <th className="text-left p-2">News Links + Summaries</th>
              <th className="text-left p-2">Created</th>
            </tr>
          </thead>
          <tbody>
            {hasResults ? (
              job.suggestions.map((s) => {
                // Cast types safely
                const urls: string[] = Array.isArray(s.newsUrls)
                  ? (s.newsUrls as string[])
                  : [];
                const metas: any[] = Array.isArray(s.newsMeta)
                  ? (s.newsMeta as any[])
                  : [];

                return (
                  <tr key={s.id} className="border-t">
                    <td className="p-2">{s.keyword}</td>
                    <td className="p-2">{s.score ?? "—"}</td>
                    <td className="p-2">
                      {urls.length ? (
                        <div className="flex flex-col gap-2 max-w-[500px]">
                          {urls.slice(0, 3).map((u, i) => {
                            const meta = metas[i] ?? null;
                            const summary =
                              typeof meta === "object" && meta?.summary
                                ? String(meta.summary)
                                : null;
                            const [expanded, setExpanded] = useState(false);

                            return (
                              <div key={`${s.id}-${i}`} className="flex flex-col">
                                <a
                                  href={u}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="text-blue-600 underline truncate"
                                  title={u}
                                >
                                  {u}
                                </a>
                                {summary && (
                                  <>
                                    <button
                                      className="text-xs text-slate-600 hover:underline text-left"
                                      onClick={() => setExpanded((prev) => !prev)}
                                    >
                                      {expanded ? "Hide summary" : "See summary"}
                                    </button>
                                    {expanded && (
                                      <p className="text-xs text-slate-700 mt-1 whitespace-pre-line">
                                        {summary.length > 300
                                          ? summary.slice(0, 300) + "…"
                                          : summary}
                                      </p>
                                    )}
                                  </>
                                )}
                              </div>
                            );
                          })}
                          {urls.length > 3 && (
                            <span className="text-xs text-slate-500">
                              +{urls.length - 3} more
                            </span>
                          )}
                        </div>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="p-2">
                      {new Date(s.createdAt).toLocaleString()}
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td className="p-3 text-slate-500" colSpan={4}>
                  No suggestions yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Auto-refresh */}
      <AutoRefresh
        enabled={!isDone && !hasResults}
        intervalMs={5000}
        maxMs={120000}
      />
    </div>
  );
}