"use client";

import Link from "@/components/Link";
import type { JobPayload } from "@/hooks/useKeywordJobPolling";

export function InlineResults({ payload }: { payload: JobPayload }) {
  const job = payload.job;
  const suggestions = payload.suggestions || [];
  const hasResults = suggestions.length > 0;

  return (
    <div className="mt-6 rounded border overflow-hidden">
      <div className="flex items-center justify-between px-3 py-2 border-b bg-slate-50">
        <div className="text-sm">
          <span className="font-medium">Job:</span>{" "}
          <span className="font-mono">{job.id}</span>{" "}
          <span className="mx-2">·</span>
          <span className="font-medium">Status:</span>{" "}
          <span>{job.status}</span>
        </div>
        <Link
          href={`/keywords/${job.id}`}
          className="text-sm underline"
        >
          Open full results ↗
        </Link>
      </div>

      {hasResults ? (
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
            {suggestions.map((s) => (
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
                      {s.newsUrls.slice(0, 3).map((u, i) => (
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
            ))}
          </tbody>
        </table>
      ) : (
        <div className="p-4 text-slate-500">No suggestions yet.</div>
      )}
    </div>
  );
}