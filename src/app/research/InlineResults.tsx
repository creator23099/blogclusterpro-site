// src/app/research/InlineResults.tsx
"use client";

import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

// --- Friendly publisher names for common domains ---
const FRIENDLY_SOURCE: Record<string, string> = {
  "nytimes.com": "NYTimes",
  "theonion.com": "The Onion",
  "taxresearch.org.uk": "Tax Research UK",
  "romesentinel.com": "Rome Sentinel",
  "island.lk": "The Island",
  // add more as you encounter them…
};

// --- Fallback brand from URL (works for any domain) ---
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

type Suggestion = {
  id: string;
  keyword: string;
  score: number | null;
  sourceUrl: string | null;
  newsUrls: string[];
  createdAt: string;
};

type ApiRes = {
  job: { id: string; topic: string | null; status: string; updatedAt: string };
  suggestions: Suggestion[];
};

export default function InlineResults(props: {
  jobId: string;

  // Controlled props from parent (ResearchClient currently passes these)
  status?: "RUNNING" | "READY" | "FAILED" | string;
  suggestions?: Suggestion[];

  // Back-compat props (if parent passes initial* instead)
  initialStatus?: "RUNNING" | "READY" | "FAILED" | string;
  initialSuggestions?: Suggestion[];
}) {
  const {
    jobId,
    status: statusProp,
    suggestions: suggestionsProp,
    initialStatus = "RUNNING",
    initialSuggestions = [],
  } = props;

  // Local state that can be controlled by parent or by our poller
  const [status, setStatus] = useState<string>(statusProp ?? initialStatus);
  const [suggestions, setSuggestions] = useState<Suggestion[]>(
    suggestionsProp ?? initialSuggestions
  );

  // Keep in sync if parent updates props
  useEffect(() => {
    if (typeof statusProp !== "undefined") setStatus(statusProp);
  }, [statusProp]);
  useEffect(() => {
    if (typeof suggestionsProp !== "undefined") setSuggestions(suggestionsProp);
  }, [suggestionsProp]);

  const hasResults = suggestions.length > 0;

  // toasts: show loading → success/fail, once per transition
  const prevStatus = useRef(status);
  useEffect(() => {
    if (prevStatus.current !== "RUNNING" && status === "RUNNING") {
      toast.loading("News & trends research in progress…", {
        id: jobId,
        description: "Fetching sources and compiling keyword suggestions.",
      });
    }
    if (prevStatus.current !== "READY" && status === "READY") {
      toast.success("News & trends research complete ✅", {
        id: jobId,
        description: "Click to open the full results page.",
        duration: 6000,
        action: {
          label: "View results",
          onClick: () => (window.location.href = `/keywords/${jobId}`),
        },
      });
    }
    if (prevStatus.current !== "FAILED" && status === "FAILED") {
      toast.error("Research failed ❌", {
        id: jobId,
        description: "Please try again with a new topic.",
        duration: 6000,
      });
    }
    prevStatus.current = status;
  }, [status, jobId]);

  // polling loop with capped backoff
  useEffect(() => {
    let cancelled = false;
    let attempt = 0;

    async function poll() {
      if (cancelled) return;
      try {
        const res = await fetch(`/api/keywords/${jobId}`, {
          method: "GET",
          headers: { "Cache-Control": "no-store" },
          cache: "no-store",
          credentials: "include", // IMPORTANT for Clerk cookies in production
        });
        const json: ApiRes = await res.json();

        if (res.ok) {
          setStatus(json.job.status);
          setSuggestions(json.suggestions || []);
          if (json.job.status === "READY" || json.job.status === "FAILED") return; // stop
        }
      } catch {
        // ignore, keep polling
      }

      attempt += 1;
      const delay = Math.min(1500 * Math.pow(1.5, attempt), 8000); // ~1.5s → 8s
      setTimeout(poll, delay);
    }

    // Only poll while we think it's running
    if (status === "RUNNING") {
      poll();
    }

    return () => {
      cancelled = true;
    };
  }, [jobId, status]);

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
              <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" opacity="0.2" />
              <path d="M4 12a8 8 0 0 1 8-8" stroke="currentColor" strokeWidth="4" fill="none" />
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
                <th className="p-2 text-left">Source</th>
                <th className="p-2 text-left">News</th>
                <th className="p-2 text-left">Created</th>
              </tr>
            </thead>
            <tbody>
              {suggestions.map((s) => {
                const sourceName = brandFromUrl(s.sourceUrl) ?? "—";
                return (
                  <tr key={s.id} className="border-t">
                    <td className="p-2">{s.keyword}</td>
                    <td className="p-2">{s.score ?? "—"}</td>

                    {/* Source shows a friendly brand name */}
                    <td className="p-2">
                      {s.sourceUrl ? (
                        <a
                          href={s.sourceUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="text-blue-600 hover:underline"
                          title={s.sourceUrl}
                        >
                          {sourceName}
                        </a>
                      ) : (
                        "—"
                      )}
                    </td>

                    {/* Show up to 3 news items labeled by domain brand */}
                    <td className="p-2">
                      {s.newsUrls?.length ? (
                        <div className="flex max-w-[340px] flex-col gap-1">
                          {s.newsUrls.slice(0, 3).map((u, i) => (
                            <a
                              key={u + i}
                              href={u}
                              target="_blank"
                              rel="noreferrer"
                              className="truncate text-blue-600 hover:underline"
                              title={u}
                            >
                              {brandFromUrl(u) ?? u}
                            </a>
                          ))}
                          {s.newsUrls.length > 3 ? (
                            <span className="text-xs text-slate-500">
                              +{s.newsUrls.length - 3} more
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