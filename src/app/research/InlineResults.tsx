// src/app/research/InlineResults.tsx
"use client";

import { toast } from "sonner";
import { useEffect, useRef, useState } from "react";

/** Friendly publisher names for common domains */
const FRIENDLY_SOURCE: Record<string, string> = {
  "nytimes.com": "NYTimes",
  "theonion.com": "The Onion",
  "taxresearch.org.uk": "Tax Research UK",
  "romesentinel.com": "Rome Sentinel",
  "island.lk": "The Island",
  // add more as needed…
};

/** Fallback brand from URL (works for any domain) */
function brandFromUrl(url?: string | null) {
  if (!url) return null;
  try {
    const h = new URL(url).hostname.replace(/^www\./, "");
    if (FRIENDLY_SOURCE[h]) return FRIENDLY_SOURCE[h];
    const parts = h.split(".");
    return parts.length >= 2 ? parts[parts.length - 2] : h;
  } catch {
    return null;
  }
}

export type NewsMetaItem = {
  url?: string | null;
  summary?: string | null;
};

export type Suggestion = {
  id: string;
  keyword: string;
  score: number | null;
  sourceUrl: string | null;
  newsUrls: string[];
  newsMeta?: NewsMetaItem[]; // <-- optional summaries array aligned by index
  createdAt: string;
};

export default function InlineResults({
  jobId,
  status,
  suggestions,
}: {
  jobId: string;
  status: "RUNNING" | "READY" | "FAILED" | string;
  suggestions: Suggestion[];
}) {
  const hasResults = suggestions?.length > 0;

  // keep track of expanded summaries per row+link index
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const toggle = (rowId: string, linkIdx: number) => {
    const key = `${rowId}:${linkIdx}`;
    setExpanded((prev) => ({ ...prev, [key]: !prev[key] }));
  };
  const isOpen = (rowId: string, linkIdx: number) => !!expanded[`${rowId}:${linkIdx}`];

  // toast transitions (loading -> success/fail), once per transition
  const prevStatus = useRef<typeof status | null>(null);
  useEffect(() => {
    const prev = prevStatus.current;

    if (prev !== "RUNNING" && status === "RUNNING") {
      toast.loading("News & trends research in progress…", {
        id: jobId,
        description: "Fetching sources and compiling keyword suggestions.",
        duration: 10000,
        dismissible: true,
      });
    }

    if (prev === "RUNNING" && status !== "RUNNING") {
      toast.dismiss(jobId);
    }

    if (prev !== "READY" && status === "READY") {
      toast.success("News & trends research complete ✅", {
        id: `${jobId}-done`,
        description: "Click to open the full results page.",
        duration: 6000,
        dismissible: true,
        action: {
          label: "View results",
          onClick: () => (window.location.href = `/keywords/${jobId}`),
        },
      });
    }

    if (prev !== "FAILED" && status === "FAILED") {
      toast.error("Research failed ❌", {
        id: `${jobId}-fail`,
        description: "Please try again with a new topic.",
        duration: 6000,
        dismissible: true,
      });
    }

    prevStatus.current = status;
  }, [status, jobId]);

  return (
    <section className="mt-8">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-semibold text-slate-900">
            Results {hasResults ? `(${suggestions.length})` : ""}
          </h2>
          {status === "RUNNING" && (
            <svg
              className="h-4 w-4 animate-spin text-blue-600"
              viewBox="0 0 24 24"
              aria-label="Research in progress"
              role="status"
            >
              <circle
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
                fill="none"
                opacity="0.2"
              />
              <path
                d="M4 12a8 8 0 0 1 8-8"
                stroke="currentColor"
                strokeWidth="4"
                fill="none"
              />
            </svg>
          )}
        </div>
        <a
          href={`/keywords/${jobId}`}
          className="text-sm font-semibold text-blue-600 hover:underline"
        >
          Open full view →
        </a>
      </div>

      {!hasResults ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          {status === "FAILED"
            ? "The job failed to complete. Please try again."
            : "Waiting for results… this section will update automatically."}
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th className="p-2 text-left">Keyword</th>
                <th className="p-2 text-left">Score</th>
                <th className="p-2 text-left">Sources</th>
                <th className="p-2 text-left">News</th>
                <th className="p-2 text-left">Created</th>
              </tr>
            </thead>
            <tbody>
              {suggestions.map((s) => {
                const brands = Array.from(
                  new Set((s.newsUrls || []).map((u) => brandFromUrl(u) || "source"))
                ).slice(0, 3);

                return (
                  <tr key={s.id} className="border-t align-top">
                    <td className="p-2">{s.keyword}</td>
                    <td className="p-2">{s.score ?? "—"}</td>

                    {/* Sources: show publishers for this row's articles */}
                    <td className="p-2">
                      {brands.length ? (
                        <span className="text-slate-800">
                          {brands.join(", ")}
                        </span>
                      ) : (
                        "—"
                      )}
                    </td>

                    {/* News: links + optional summary toggles */}
                    <td className="p-2">
                      {s.newsUrls?.length ? (
                        <div className="flex max-w-[420px] flex-col gap-2">
                          {s.newsUrls.slice(0, 5).map((u, i) => {
                            const label = brandFromUrl(u) ?? u;
                            const maybeSummary =
                              s.newsMeta?.[i]?.summary?.trim() || null;
                            const open = isOpen(s.id, i);

                            return (
                              <div key={`${u}-${i}`} className="space-y-1">
                                <div className="flex items-center gap-2">
                                  <a
                                    href={u}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="truncate text-blue-600 hover:underline"
                                    title={u}
                                  >
                                    {label}
                                  </a>
                                  {maybeSummary ? (
                                    <button
                                      type="button"
                                      onClick={() => toggle(s.id, i)}
                                      className="rounded-md border border-slate-300 px-2 py-0.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
                                    >
                                      {open ? "Hide summary" : "See summary"}
                                    </button>
                                  ) : null}
                                </div>
                                {open && maybeSummary ? (
                                  <div className="rounded-md border border-slate-200 bg-slate-50 p-2 text-xs leading-5 text-slate-700">
                                    {maybeSummary}
                                  </div>
                                ) : null}
                              </div>
                            );
                          })}
                          {s.newsUrls.length > 5 ? (
                            <span className="text-xs text-slate-500">
                              +{s.newsUrls.length - 5} more
                            </span>
                          ) : null}
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
              })}
            </tbody>
          </table>
        </div>
      )}

      <div className="mt-3 text-xs text-slate-500">
        Status: <span className="font-medium">{status}</span>
      </div>
    </section>
  );
}