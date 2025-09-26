"use client";

import { toast } from "sonner";
import { useEffect, useMemo, useRef, useState } from "react";

/** Friendly publisher names for common domains */
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
  newsMeta?: NewsMetaItem[]; // optional summaries array aligned by index
  createdAt: string;
};

export type Topics = {
  top: string[];
  rising: string[];
  all: string[];
};

export default function InlineResults({
  jobId,
  status,
  suggestions,
  topics,
  maxSelectable = 3,
}: {
  jobId: string;
  status: "RUNNING" | "READY" | "FAILED" | string;
  suggestions: Suggestion[];
  topics?: Topics;
  maxSelectable?: number;
}) {
  const hasResults = suggestions?.length > 0;

  // expand/collapse per row+link index
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const toggle = (rowId: string, linkIdx: number) => {
    const key = `${rowId}:${linkIdx}`;
    setExpanded((prev) => ({ ...prev, [key]: !prev[key] }));
  };
  const isOpen = (rowId: string, linkIdx: number) => !!expanded[`${rowId}:${linkIdx}`];

  // selection (pick up to N)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
        return next;
      }
      if (next.size >= maxSelectable) {
        toast.info(`You can select up to ${maxSelectable}.`);
        return prev;
      }
      next.add(id);
      return next;
    });
  };
  const onSelectAll = () => {
    const firstN = suggestions.slice(0, maxSelectable).map((s) => s.id);
    setSelectedIds(new Set(firstN));
  };
  const onClear = () => setSelectedIds(new Set());

  // optional topics chips
  const [pickedTopics, setPickedTopics] = useState<Set<string>>(new Set());
  const hasTopics = !!topics && (topics.top.length || topics.rising.length || topics.all.length);
  const toggleTopic = (label: string) => {
    setPickedTopics((prev) => {
      const next = new Set(prev);
      if (next.has(label)) next.delete(label);
      else next.add(label);
      return next;
    });
  };

  // next link -> /keywords/[jobId]
  const proceedHref = useMemo(() => {
    const url = new URL(`/keywords/${jobId}`, window.location.origin);
    if (selectedIds.size) url.searchParams.set("pick", Array.from(selectedIds).join(","));
    if (pickedTopics.size) url.searchParams.set("topics", Array.from(pickedTopics).join(","));
    return url.pathname + url.search;
  }, [jobId, selectedIds, pickedTopics]);

  // toasts
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

  const showGear = status === "RUNNING";

  return (
    <section className="mt-8 space-y-4">
      {/* Optional topics */}
      {hasTopics ? (
        <div className="rounded-lg border border-slate-200 bg-white">
          <div className="flex items-center justify-between border-b bg-slate-50 px-4 py-2">
            <h3 className="text-sm font-semibold text-slate-900">Trending topics</h3>
            <span className="text-xs text-slate-500">Select any you want to include in the next step</span>
          </div>
          <div className="space-y-3 p-3">
            {topics!.top.length ? (
              <TopicRow label="Top" items={topics!.top} picked={pickedTopics} onToggle={toggleTopic} />
            ) : null}
            {topics!.rising.length ? (
              <TopicRow label="Rising" items={topics!.rising} picked={pickedTopics} onToggle={toggleTopic} />
            ) : null}
            {topics!.all.length ? (
              <TopicRow label="All" items={topics!.all} picked={pickedTopics} onToggle={toggleTopic} />
            ) : null}
          </div>
        </div>
      ) : null}

      <div className="mb-1 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-semibold text-slate-900">
            Results {hasResults ? `(${suggestions.length})` : ""}
          </h2>
          {showGear && (
            <svg className="h-4 w-4 animate-spin text-blue-600" viewBox="0 0 24 24" aria-label="Research in progress" role="status">
              <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" opacity="0.2" />
              <path d="M4 12a8 8 0 0 1 8-8" stroke="currentColor" strokeWidth="4" fill="none" />
            </svg>
          )}
        </div>

        <a href={`/keywords/${jobId}`} className="text-sm font-semibold text-blue-600 hover:underline">
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
                <th className="p-2 text-left w-10"></th>
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

                const checked = selectedIds.has(s.id);

                return (
                  <tr key={s.id} className="border-t align-top">
                    {/* select checkbox */}
                    <td className="p-2">
                      <input
                        type="checkbox"
                        aria-label={`Select ${s.keyword}`}
                        checked={checked}
                        onChange={() => toggleSelect(s.id)}
                        className="h-4 w-4 accent-blue-600"
                      />
                    </td>

                    <td className="p-2">
                      <div className="max-w-[280px] truncate" title={s.keyword}>
                        {s.keyword}
                      </div>
                    </td>

                    <td className="p-2">{s.score ?? "—"}</td>

                    {/* Sources: show publishers for this row's articles */}
                    <td className="p-2">
                      {brands.length ? <span className="text-slate-800">{brands.join(", ")}</span> : "—"}
                    </td>

                    {/* News: links + optional summary toggles (up to 5) */}
                    <td className="p-2">
                      {s.newsUrls?.length ? (
                        <div className="flex max-w-[460px] flex-col gap-2">
                          {s.newsUrls.slice(0, 5).map((u, i) => {
                            const label = brandFromUrl(u) ?? u;
                            const maybeSummary = s.newsMeta?.[i]?.summary?.trim() || null;
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
                            <span className="text-xs text-slate-500">+{s.newsUrls.length - 5} more</span>
                          ) : null}
                        </div>
                      ) : (
                        "—"
                      )}
                    </td>

                    <td className="p-2">{new Date(s.createdAt).toLocaleString()}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Selection controls */}
      <div className="flex items-center justify-between">
        <div className="text-xs text-slate-500">
          Status: <span className="font-medium">{status}</span>
        </div>

        {hasResults ? (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onSelectAll}
              className="rounded-md border border-slate-300 px-3 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50"
            >
              Select first {maxSelectable}
            </button>
            <button
              type="button"
              onClick={onClear}
              className="rounded-md border border-slate-300 px-3 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50"
            >
              Clear
            </button>
            <a
              href={proceedHref}
              className={`rounded-md px-3 py-1 text-xs font-semibold ${
                selectedIds.size === 0
                  ? "pointer-events-none cursor-not-allowed bg-slate-200 text-slate-500"
                  : "bg-blue-600 text-white hover:bg-blue-700"
              }`}
              aria-disabled={selectedIds.size === 0}
            >
              Continue ({selectedIds.size}/{maxSelectable})
            </a>
          </div>
        ) : null}
      </div>
    </section>
  );
}

/* ============== Small subcomponent: Topic chips ============== */

function TopicRow({
  label,
  items,
  picked,
  onToggle,
}: {
  label: string;
  items: string[];
  picked: Set<string>;
  onToggle: (label: string) => void;
}) {
  if (!items.length) return null;
  return (
    <div>
      <div className="mb-2 text-xs font-semibold text-slate-600">{label}</div>
      <div className="flex flex-wrap gap-1.5">
        {items.map((t) => {
          const isOn = picked.has(t);
          return (
            <button
              key={t}
              type="button"
              onClick={() => onToggle(t)}
              className={`rounded-full border px-2.5 py-1 text-xs ${
                isOn
                  ? "border-blue-200 bg-blue-50 text-blue-700"
                  : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
              }`}
              title={t}
            >
              {t}
            </button>
          );
        })}
      </div>
    </div>
  );
}