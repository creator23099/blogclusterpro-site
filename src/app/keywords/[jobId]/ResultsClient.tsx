// src/app/keywords/[jobId]/ResultsClient.tsx
"use client";

import { useState } from "react";

type SuggestionDTO = {
  id: string;
  keyword: string;
  score: number | null;
  newsUrls: string[];
  newsMeta: any[];
  createdAt: string;
};

export default function ResultsClient({
  hasResults,
  suggestions,
}: {
  hasResults: boolean;
  suggestions: SuggestionDTO[];
}) {
  return (
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
            suggestions.map((s) => (
              <tr key={s.id} className="border-t">
                <td className="p-2">{s.keyword}</td>
                <td className="p-2">{s.score ?? "—"}</td>
                <td className="p-2">
                  {s.newsUrls?.length ? (
                    <div className="flex flex-col gap-2 max-w-[500px]">
                      {s.newsUrls.slice(0, 3).map((u, i) => {
                        const meta = Array.isArray(s.newsMeta)
                          ? s.newsMeta[i] ?? null
                          : null;
                        const summary =
                          meta && typeof meta === "object" && typeof meta.summary === "string"
                            ? meta.summary
                            : null;
                        return (
                          <LinkWithSummary
                            key={`${s.id}-${i}`}
                            url={u}
                            summary={summary}
                          />
                        );
                      })}
                      {s.newsUrls.length > 3 && (
                        <span className="text-xs text-slate-500">
                          +{s.newsUrls.length - 3} more
                        </span>
                      )}
                    </div>
                  ) : (
                    "—"
                  )}
                </td>
                <td className="p-2">{new Date(s.createdAt).toLocaleString()}</td>
              </tr>
            ))
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
  );
}

function LinkWithSummary({ url, summary }: { url: string; summary: string | null }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="flex flex-col">
      <a
        href={url}
        target="_blank"
        rel="noreferrer"
        className="text-blue-600 underline truncate"
        title={url}
      >
        {url}
      </a>

      {summary && (
        <>
          <button
            className="text-xs text-slate-600 hover:underline text-left"
            onClick={() => setExpanded((p) => !p)}
          >
            {expanded ? "Hide summary" : "See summary"}
          </button>
          {expanded && (
            <p className="text-xs text-slate-700 mt-1 whitespace-pre-line">
              {summary.length > 300 ? summary.slice(0, 300) + "…" : summary}
            </p>
          )}
        </>
      )}
    </div>
  );
}