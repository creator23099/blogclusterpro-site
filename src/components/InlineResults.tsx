// src/components/InlineResults.tsx
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import Link from "@/components/Link";

/** Friendly publisher names for common domains (optional prettifiers) */
const FRIENDLY_SOURCE: Record<string, string> = {
  "nytimes.com": "NYTimes",
  "theonion.com": "The Onion",
  "taxresearch.org.uk": "Tax Research UK",
  "romesentinel.com": "Rome Sentinel",
  "island.lk": "The Island",
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

type PreviewArticle = {
  id: string;
  url: string | null;
  title: string | null;
  sourceName: string | null;
  publishedTime: string | null;
  snippet: string | null;
};

export type JobPayload = {
  job: { id: string; status: "RUNNING" | "READY" | "FAILED" | string };
  // optional - not used here, we fetch richer preview data instead
  suggestions?: Array<{
    id: string;
    keyword: string;
    score: number | null;
    sourceUrl: string | null;
    newsUrls: string[];
    createdAt: string;
  }>;
  // you can pass these pre-fetched if you want; otherwise we fetch via preview API
  articles?: PreviewArticle[];
  supportingTopics?: { top: string[]; rising: string[]; all: string[] };
};

export default function InlineResults({ payload }: { payload: JobPayload }) {
  const { job } = payload;
  const jobId = job.id;

  // --------- fetch preview (articles + supporting topics) ----------
  const [articles, setArticles] = useState<PreviewArticle[]>(payload.articles ?? []);
  const [topics, setTopics] = useState<{ top: string[]; rising: string[]; all: string[] }>(
    payload.supportingTopics ?? { top: [], rising: [], all: [] }
  );
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      // if not provided via props, fetch from preview API
      if (payload.articles && payload.supportingTopics) return;
      const res = await fetch(`/api/research/preview?jobId=${encodeURIComponent(jobId)}`, {
        method: "GET",
        headers: { "Cache-Control": "no-store" },
      });
      if (!res.ok) return;
      const data = await res.json();
      if (cancelled) return;

      setArticles(data.articles || []);
      setTopics(data.supportingTopics || { top: [], rising: [], all: [] });
      // auto-preselect first 1–3 articles for convenience
      const firstIds = (data.articles || []).slice(0, 3).map((a: any) => a.id);
      setSelArticles(firstIds);
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [jobId, payload.articles, payload.supportingTopics]);

  // --------- selections ----------
  const [selArticles, setSelArticles] = useState<string[]>([]);
  const [selTopics, setSelTopics] = useState<string[]>([]);
  const [openSummary, setOpenSummary] = useState<Record<string, boolean>>({});

  function toggleArticle(id: string) {
    setSelArticles(prev => (prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]));
  }
  function toggleTopic(label: string) {
    setSelTopics(prev => {
      const has = prev.includes(label);
      if (has) return prev.filter(x => x !== label);
      if (prev.length >= 3) {
        toast.info("Pick exactly 3 supporting topics.");
        return prev;
      }
      return [...prev, label];
    });
  }

  const pickedArticleIds = useMemo(
    () => articles.filter(a => selArticles.includes(a.id)).map(a => a.id),
    [articles, selArticles]
  );

  // --------- toasts for status changes ----------
  const prevStatus = useRef<typeof job.status | null>(null);
  useEffect(() => {
    const prev = prevStatus.current;
    if (prev !== "RUNNING" && job.status === "RUNNING") {
      toast.loading("Research in progress…", {
        id: jobId,
        description: "Fetching sources and compiling supporting topics.",
        duration: 6000,
        dismissible: true,
      });
    }
    if (prev === "RUNNING" && job.status !== "RUNNING") toast.dismiss(jobId);

    if (prev !== "READY" && job.status === "READY") {
      toast.success("Research complete ✅", {
        id: `${jobId}-done`,
        description: "Open the full results to continue.",
        duration: 5000,
        dismissible: true,
        action: {
          label: "View",
          onClick: () => (window.location.href = `/keywords/${jobId}`),
        },
      });
    }
    if (prev !== "FAILED" && job.status === "FAILED") {
      toast.error("Research failed ❌", {
        id: `${jobId}-fail`,
        description: "Please try again with a new topic.",
        duration: 6000,
        dismissible: true,
      });
    }
    prevStatus.current = job.status;
  }, [job.status, jobId]);

  // --------- trigger Flow 2 (formatter) ----------
  async function draftOutlines() {
    try {
      if (selTopics.length !== 3) {
        toast.info("Pick exactly 3 supporting topics.");
        return;
      }
      if (pickedArticleIds.length === 0) {
        toast.info("Pick at least 1 article.");
        return;
      }
      setLoading(true);

      const res = await fetch("/api/internal/n8n/outline/start", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
        body: JSON.stringify({
          jobId,
          topics: selTopics,          // the 3 chosen labels
          articleIds: pickedArticleIds, // IDs only (Flow 2 should NOT re-read URLs)
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data?.error || `HTTP ${res.status}`);
      }

      toast.success("Outline job queued ✅", {
        description: "We’ll notify you when the outlines are ready.",
      });
      // If you want to jump to /writer automatically, do it here:
      // window.location.href = "/writer";
    } catch (err: any) {
      toast.error("Couldn't start outline job", {
        description: String(err?.message || err || "Unknown error"),
      });
    } finally {
      setLoading(false);
    }
  }

  // --------- UI ---------
  const proceedHref = useMemo(() => `/keywords/${jobId}`, [jobId]);

  return (
    <section className="mt-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between rounded border bg-slate-50 px-3 py-2">
        <div className="text-sm">
          <span className="font-medium">Job:</span>{" "}
          <span className="font-mono">{jobId}</span>{" "}
          <span className="mx-2">·</span>
          <span className="font-medium">Status:</span>{" "}
          <span>{job.status}</span>
        </div>
        <Link href={proceedHref} className="text-sm underline">
          Open full results ↗
        </Link>
      </div>

      {/* News Articles */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
          <h3 className="text-sm font-semibold text-slate-900">
            News Articles (select any you want to use)
          </h3>
          <span className="text-xs text-slate-500">
            Selected: {pickedArticleIds.length}
          </span>
        </div>

        <ul className="divide-y divide-slate-100">
          {articles.map(a => {
            const selected = selArticles.includes(a.id);
            const source =
              a.sourceName && a.sourceName !== "unknown_source"
                ? a.sourceName
                : brandFromUrl(a.url) || "—";
            const hasSnippet = !!a.snippet?.trim();
            const open = !!openSummary[a.id];

            return (
              <li key={a.id} className="flex items-start gap-3 px-4 py-3">
                <input
                  type="checkbox"
                  className="mt-1 h-4 w-4 rounded border-slate-300"
                  checked={selected}
                  onChange={() => toggleArticle(a.id)}
                />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium text-slate-900">
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
                  <div className="mt-0.5 text-xs text-slate-500">
                    {source}
                    {a.publishedTime ? ` • ${new Date(a.publishedTime).toLocaleString()}` : ""}
                  </div>

                  {hasSnippet && (
                    <div className="mt-2">
                      <button
                        type="button"
                        onClick={() =>
                          setOpenSummary(p => ({ ...p, [a.id]: !p[a.id] }))
                        }
                        className="rounded-md border border-slate-300 px-2 py-0.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
                      >
                        {open ? "Hide summary" : "See summary"}
                      </button>
                      {open ? (
                        <div className="mt-2 rounded-md border border-slate-200 bg-slate-50 p-2 text-xs leading-5 text-slate-700">
                          {a.snippet}
                        </div>
                      ) : null}
                    </div>
                  )}
                </div>
              </li>
            );
          })}
          {articles.length === 0 ? (
            <li className="px-4 py-6 text-sm text-slate-500">No articles yet.</li>
          ) : null}
        </ul>
      </div>

      {/* Supporting Topics */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
          <h3 className="text-sm font-semibold text-slate-900">Supporting Blog Topics (pick exactly 3)</h3>
          <span className="text-xs text-slate-500">Selected: {selTopics.length} / 3</span>
        </div>

        <TopicSection title="Top" items={topics.top} selected={selTopics} onToggle={toggleTopic} />
        <TopicSection title="Rising" items={topics.rising} selected={selTopics} onToggle={toggleTopic} />
        <TopicSection title="All" items={topics.all} selected={selTopics} onToggle={toggleTopic} />
      </div>

      {/* Footer actions */}
      <div className="flex items-center justify-between">
        <div className="text-xs text-slate-500">
          Status: <span className="font-medium">{job.status}</span>
        </div>
        <div className="flex gap-2">
          <a
            href={proceedHref}
            className="rounded-md px-3 py-1 text-xs font-semibold bg-slate-100 text-slate-700 hover:bg-slate-200"
          >
            Continue
          </a>
          <button
            onClick={draftOutlines}
            disabled={loading || selTopics.length !== 3 || pickedArticleIds.length === 0}
            className={`rounded-md px-3 py-1 text-xs font-semibold ${
              loading || selTopics.length !== 3 || pickedArticleIds.length === 0
                ? "cursor-not-allowed bg-slate-200 text-slate-500"
                : "bg-blue-600 text-white hover:bg-blue-700"
            }`}
            aria-disabled={loading || selTopics.length !== 3 || pickedArticleIds.length === 0}
          >
            {loading ? "Starting…" : "Draft Outlines"}
          </button>
        </div>
      </div>
    </section>
  );
}

function TopicSection({
  title,
  items,
  selected,
  onToggle,
}: {
  title: string;
  items: string[];
  selected: string[];
  onToggle: (label: string) => void;
}) {
  return (
    <div className="px-4 py-3">
      <div className="mb-2 text-xs font-semibold text-slate-500">{title.toUpperCase()}</div>
      <div className="flex flex-wrap gap-2">
        {items.length === 0 ? <div className="text-xs text-slate-400">None</div> : null}
        {items.map(label => {
          const isSel = selected.includes(label);
          return (
            <button
              key={`${title}:${label}`}
              type="button"
              onClick={() => onToggle(label)}
              className={`rounded-full border px-3 py-1 text-sm ${
                isSel ? "border-blue-600 bg-blue-50 text-blue-700" : "border-slate-300 text-slate-700 hover:bg-slate-50"
              }`}
              title={label}
            >
              {label}
            </button>
          );
        })}
      </div>
    </div>
  );
}