"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

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

export type Suggestion = {
  id: string;
  keyword: string;
  score: number | null;
  sourceUrl: string | null;
  newsUrls: string[];
  createdAt: string;
};

type PreviewArticle = {
  id: string;
  url: string | null;
  title: string | null;
  sourceName: string | null; // server already applies hostname fallback
  publishedTime: string | null;
  snippet: string | null;
};

export default function InlineResults({
  jobId,
  status,
  suggestions, // (optional & unused)
  maxSelectable = 3,
}: {
  jobId: string;
  status: "RUNNING" | "READY" | "FAILED" | string;
  suggestions?: Suggestion;
  maxSelectable?: number; // articles to pick
}) {
  // --------- inline preview data (from /api/research/preview) ----------
  const [articles, setArticles] = useState<PreviewArticle[]>([]);
  const [topics, setTopics] = useState<{ top: string[]; rising: string[]; all: string[] }>({
    top: [],
    rising: [],
    all: [],
  });

  // selections
  const [selArticles, setSelArticles] = useState<string[]>([]);
  const [selTopics, setSelTopics] = useState<string[]>([]);

  // loading state for the Draft Outlines button
  const [drafting, setDrafting] = useState(false);

  // summary expand/collapse keyed by article id
  const [openSummary, setOpenSummary] = useState<Record<string, boolean>>({});
  const toggleSummary = (id: string) =>
    setOpenSummary((p) => ({ ...p, [id]: !p[id] }));

  // fetch preview once we have a jobId
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!jobId) return;
      const res = await fetch(`/api/research/preview?jobId=${encodeURIComponent(jobId)}`, {
        method: "GET",
        headers: { "Cache-Control": "no-store" },
      });
      if (!res.ok) return;
      const data = await res.json();
      if (cancelled) return;

      setArticles(data.articles || []);
      setTopics(data.supportingTopics || { top: [], rising: [], all: [] });

      // auto-select first up to maxSelectable
      const firstIds = (data.articles || []).slice(0, maxSelectable).map((a: any) => a.id);
      setSelArticles(firstIds);
    })();
    return () => {
      cancelled = true;
    };
  }, [jobId, maxSelectable]);

  // toasts for status
  const prevStatus = useRef<typeof status | null>(null);
  useEffect(() => {
    const prev = prevStatus.current;

    if (prev !== "RUNNING" && status === "RUNNING") {
      toast.loading("News & trends research in progress…", {
        id: jobId,
        description: "Fetching sources and compiling supporting topics.",
        duration: 8000,
        dismissible: true,
      });
    }
    if (prev === "RUNNING" && status !== "RUNNING") toast.dismiss(jobId);

    if (prev !== "READY" && status === "READY") {
      toast.success("Research complete ✅", {
        id: `${jobId}-done`,
        description: "Open the full results to continue.",
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

  // proceed link (still keeping in case you want it)
  const proceedHref = useMemo(() => {
    const url = new URL(`/keywords/${jobId}`, window.location.origin);
    if (selArticles.length) url.searchParams.set("pickArticles", selArticles.join(","));
    if (selTopics.length) url.searchParams.set("topics", selTopics.join(","));
    return url.pathname + url.search;
  }, [jobId, selArticles, selTopics]);

  // selection helpers
  const selArticleCount = selArticles.length;
  const selTopicCount = selTopics.length;

  function toggleArticle(id: string) {
    setSelArticles((prev) => {
      const has = prev.includes(id);
      if (has) return prev.filter((x) => x !== id);
      if (prev.length >= maxSelectable) {
        toast.info(`You can select up to ${maxSelectable} articles.`);
        return prev;
      }
      return [...prev, id];
    });
  }

  // ✅ cap topics at EXACTLY 3 for drafting
  const TOPIC_CAP = 3;
  function toggleTopic(label: string) {
    setSelTopics((prev) => {
      const has = prev.includes(label);
      if (has) return prev.filter((x) => x !== label);
      if (prev.length >= TOPIC_CAP) {
        toast.info(`Please pick exactly ${TOPIC_CAP} supporting topics.`);
        return prev;
      }
      return [...prev, label];
    });
  }

  const showGear = status === "RUNNING";

  async function draftOutlines() {
    if (selTopics.length !== TOPIC_CAP) {
      toast.info(`Pick exactly ${TOPIC_CAP} topics to draft outlines.`);
      return;
    }
    setDrafting(true);
    try {
      const res = await fetch("/api/internal/n8n/outline", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jobId,
          topics: selTopics,
          articleIds: selArticles, // optional: helpful context
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data?.error || "Failed to start outline job");
      }

      toast.success("Outline job started ✅", {
        description: "You can head to Writer shortly while we prepare drafts.",
      });
      // Optional: navigate to /writer automatically
      // window.location.href = "/writer";
    } catch (err: any) {
      toast.error("Couldn’t start outline job", {
        description: err?.message || "Please try again.",
      });
    } finally {
      setDrafting(false);
    }
  }

  return (
    <section className="mt-8 space-y-6">
      <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm text-emerald-900">
        {status === "READY"
          ? "Ready — preview loaded below."
          : "Waiting for results… this section will update automatically."}
      </div>

      {/* -------------------- NEWS (FIRST) -------------------- */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold text-slate-900">
              News Articles (pick up to {maxSelectable})
            </h3>
            {showGear ? (
              <svg className="h-4 w-4 animate-spin text-blue-600" viewBox="0 0 24 24" aria-hidden>
                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" opacity="0.2" />
                <path d="M4 12a8 8 0 0 1 8-8" stroke="currentColor" strokeWidth="4" fill="none" />
              </svg>
            ) : null}
          </div>
          <span className="text-xs text-slate-500">Selected: {selArticleCount} / {maxSelectable}</span>
        </div>

        <ul className="divide-y divide-slate-100">
          {articles.map((a) => {
            const selected = selArticles.includes(a.id);
            // 👇 treat "unknown_source" as empty and fall back to hostname
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
                        onClick={() => toggleSummary(a.id)}
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

      {/* -------------------- SUPPORTING TOPICS (BELOW) -------------------- */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
          <h3 className="text-sm font-semibold text-slate-900">
            Supporting Blog Topics (pick exactly {TOPIC_CAP})
          </h3>
          <span className="text-xs text-slate-500">Selected: {selTopicCount} / {TOPIC_CAP}</span>
        </div>

        <TopicSection title="Top" items={topics.top} selected={selTopics} onToggle={toggleTopic} />
        <TopicSection title="Rising" items={topics.rising} selected={selTopics} onToggle={toggleTopic} />
        <TopicSection title="All" items={topics.all} selected={selTopics} onToggle={toggleTopic} />
      </div>

      {/* footer controls */}
      <div className="flex items-center justify-between">
        <div className="text-xs text-slate-500">
          Status: <span className="font-medium">{status}</span>
        </div>

        <div className="flex items-center gap-2">
          {/* Optional keep: Continue link */}
          <a
            href={proceedHref}
            className={`rounded-md px-3 py-1 text-xs font-semibold ${
              selArticleCount === 0
                ? "pointer-events-none cursor-not-allowed bg-slate-200 text-slate-500"
                : "bg-slate-900 text-white hover:bg-black"
            }`}
            aria-disabled={selArticleCount === 0}
          >
            Continue ({selArticleCount}/{maxSelectable})
          </a>

          {/* New: Draft Outlines */}
          <button
            type="button"
            onClick={draftOutlines}
            disabled={selTopics.length !== TOPIC_CAP || drafting}
            className={`rounded-md px-3 py-1 text-xs font-semibold ${
              selTopics.length === TOPIC_CAP && !drafting
                ? "bg-blue-600 text-white hover:bg-blue-700"
                : "bg-slate-200 text-slate-500 cursor-not-allowed"
            }`}
            aria-busy={drafting}
          >
            {drafting ? "Starting…" : "Draft Outlines"}
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
        {items.map((label) => {
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