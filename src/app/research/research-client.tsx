"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import Link from "@/components/Link";

/** Country -> Region map (US + CA) */
const REGIONS: Record<string, Array<{ value: string; label: string }>> = {
  US: [
    { value: "ALL", label: "All United States" },
    { value: "AL", label: "Alabama" },
    { value: "AK", label: "Alaska" },
    { value: "AZ", label: "Arizona" },
    { value: "AR", label: "Arkansas" },
    { value: "CA", label: "California" },
    { value: "CO", label: "Colorado" },
    { value: "CT", label: "Connecticut" },
    { value: "DE", label: "Delaware" },
    { value: "FL", label: "Florida" },
    { value: "GA", label: "Georgia" },
    { value: "HI", label: "Hawaii" },
    { value: "ID", label: "Idaho" },
    { value: "IL", label: "Illinois" },
    { value: "IN", label: "Indiana" },
    { value: "IA", label: "Iowa" },
    { value: "KS", label: "Kansas" },
    { value: "KY", label: "Kentucky" },
    { value: "LA", label: "Louisiana" },
    { value: "ME", label: "Maine" },
    { value: "MD", label: "Maryland" },
    { value: "MA", label: "Massachusetts" },
    { value: "MI", label: "Michigan" },
    { value: "MN", label: "Minnesota" },
    { value: "MS", label: "Mississippi" },
    { value: "MO", label: "Missouri" },
    { value: "MT", label: "Montana" },
    { value: "NE", label: "Nebraska" },
    { value: "NV", label: "Nevada" },
    { value: "NH", label: "New Hampshire" },
    { value: "NJ", label: "New Jersey" },
    { value: "NM", label: "New Mexico" },
    { value: "NY", label: "New York" },
    { value: "NC", label: "North Carolina" },
    { value: "ND", label: "North Dakota" },
    { value: "OH", label: "Ohio" },
    { value: "OK", label: "Oklahoma" },
    { value: "OR", label: "Oregon" },
    { value: "PA", label: "Pennsylvania" },
    { value: "RI", label: "Rhode Island" },
    { value: "SC", label: "South Carolina" },
    { value: "SD", label: "South Dakota" },
    { value: "TN", label: "Tennessee" },
    { value: "TX", label: "Texas" },
    { value: "UT", label: "Utah" },
    { value: "VT", label: "Vermont" },
    { value: "VA", label: "Virginia" },
    { value: "WA", label: "Washington" },
    { value: "WV", label: "West Virginia" },
    { value: "WI", label: "Wisconsin" },
    { value: "WY", label: "Wyoming" },
    { value: "DC", label: "District of Columbia" },
    { value: "PR", label: "Puerto Rico" },
    { value: "GU", label: "Guam" },
    { value: "VI", label: "U.S. Virgin Islands" },
    { value: "AS", label: "American Samoa" },
    { value: "MP", label: "Northern Mariana Islands" },
  ],
  CA: [
    { value: "ALL", label: "All Canada" },
    { value: "AB", label: "Alberta" },
    { value: "BC", label: "British Columbia" },
    { value: "MB", label: "Manitoba" },
    { value: "NB", label: "New Brunswick" },
    { value: "NL", label: "Newfoundland and Labrador" },
    { value: "NS", label: "Nova Scotia" },
    { value: "NT", label: "Northwest Territories" },
    { value: "NU", label: "Nunavut" },
    { value: "ON", label: "Ontario" },
    { value: "PE", label: "Prince Edward Island" },
    { value: "QC", label: "Quebec" },
    { value: "SK", label: "Saskatchewan" },
    { value: "YT", label: "Yukon" },
  ],
};

function LoadingOverlay({ show, label = "Running research…" }: { show: boolean; label?: string }) {
  if (!show) return null;
  return (
    <div className="pointer-events-none fixed bottom-4 right-4 z-[80]">
      <div className="pointer-events-auto rounded-xl border border-slate-200 bg-white/95 px-4 py-2 shadow-lg ring-1 ring-black/5">
        <div className="flex items-center gap-2">
          <svg className="h-5 w-5 animate-spin" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
            <path d="M11 2h2v3h-2V2Zm6.657 2.343 1.414 1.414-2.122 2.121-1.414-1.414 2.122-2.121ZM2 11h3v2H2v-2Zm16.95 1a6.95 6.95 0 1 1-13.9 0 6.95 6.95 0 0 1 13.9 0Zm.808 6.243-2.122-2.121 1.414-1.415 2.122 2.122-1.414 1.414ZM11 19h2v3h-2v-3ZM4.05 18.657l-1.414-1.414 2.122-2.122 1.414 1.415-2.122 2.121ZM4.05 5.343 6.172 7.465 4.758 8.88 2.636 6.757 4.05 5.343Z" />
          </svg>
          <span className="text-sm font-medium text-slate-700">{label}</span>
        </div>
      </div>
    </div>
  );
}

type StatusResponse = {
  ok: boolean;
  jobId: string;
  status: "QUEUED" | "RUNNING" | "READY" | "FAILED" | string;
  topic?: string;
  country?: string;
  region?: string;
};

type PreviewArticle = {
  id: string;
  title: string | null;
  url: string;
  sourceName?: string | null;
  publishedTime?: string | null;
  snippet?: string | null;
};

type PreviewPayload = {
  ok: boolean;
  jobId: string;
  articles: PreviewArticle[];
  topics: { top: string[]; rising: string[]; all: string[] };
};

const SS_KEY = "bcp_research_cache_v2";

export default function ResearchClient() {
  const router = useRouter();
  const qs = useSearchParams();
  const clusterId = qs.get("clusterId") || "";
  const qsJobId = qs.get("jobId") || "";

  const [topic, setTopic] = useState("");
  const [country, setCountry] = useState<"GLOBAL" | "US" | "CA">("US");
  const [region, setRegion] = useState<string>("ALL");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const [jobId, setJobId] = useState<string | null>(null);
  const [jobStatus, setJobStatus] = useState<StatusResponse["status"]>("RUNNING");
  const [isReadyHere, setIsReadyHere] = useState(false);

  // Inline preview
  const [articles, setArticles] = useState<PreviewArticle[]>([]);
  const [supporting, setSupporting] = useState<{ top: string[]; rising: string[]; all: string[] }>({
    top: [],
    rising: [],
    all: [],
  });

  // Selections (limits: 3 articles, 5 topics)
  const [selectedArticleIds, setSelectedArticleIds] = useState<string[]>([]);
  const [selectedTopics, setSelectedTopics] = useState<string[]>([]);

  const pollTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const regionOptions = useMemo(() => (country === "GLOBAL" ? [] : REGIONS[country] || []), [country]);

  function computeLocationString(c: string, r: string) {
    if (c === "GLOBAL") return "GLOBAL";
    if (!r || r === "ALL") return c;
    return `${c}:${r}`;
  }

  const toggleWithLimit = <T,>(arr: T[], value: T, limit: number) => {
    if (arr.includes(value)) return arr.filter((x) => x !== value);
    if (arr.length >= limit) return arr;
    return [...arr, value];
  };

  // Persist & restore
  function persistToSession(next: {
    jobId: string;
    status: string;
    articles: PreviewArticle[];
    supporting: { top: string[]; rising: string[]; all: string[] };
  }) {
    try {
      sessionStorage.setItem(SS_KEY, JSON.stringify(next));
    } catch {}
  }
  function restoreFromSession():
    | {
        jobId: string;
        status: StatusResponse["status"];
        articles: PreviewArticle[];
        supporting: { top: string[]; rising: string[]; all: string[] };
      }
    | null {
    try {
      const raw = sessionStorage.getItem(SS_KEY);
      if (!raw) return null;
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }

  useEffect(() => {
    let restored = false;
    if (qsJobId) {
      setJobId(qsJobId);
      setJobStatus("RUNNING");
      setIsReadyHere(false);
      setArticles([]);
      setSupporting({ top: [], rising: [], all: [] });
      restored = true;
    } else {
      const cache = restoreFromSession();
      if (cache?.jobId) {
        setJobId(cache.jobId);
        setJobStatus(cache.status);
        setArticles(cache.articles || []);
        setSupporting(cache.supporting || { top: [], rising: [], all: [] });
        setIsReadyHere(cache.status === "READY");
        restored = true;
      }
    }
    if (!restored) return;
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!jobId) return;
    persistToSession({ jobId, status: jobStatus, articles, supporting });
  }, [jobId, jobStatus, articles, supporting]);

  async function fetchPreview(currentJobId: string) {
    const res = await fetch(`/api/research/preview?jobId=${encodeURIComponent(currentJobId)}`, {
      method: "GET",
      headers: { "Cache-Control": "no-store" },
    });
    if (!res.ok) return;
    const data = (await res.json()) as PreviewPayload;
    if (!data?.ok) return;
    setArticles(data.articles || []);
    setSupporting(data.topics || { top: [], rising: [], all: [] });
  }

  // Poller — NO redirect. Toast + inline preview.
  async function pollOnce(currentJobId: string) {
    try {
      const res = await fetch(`/api/research/status?jobId=${encodeURIComponent(currentJobId)}`, {
        method: "GET",
        headers: { "Cache-Control": "no-store" },
        credentials: "include",
        cache: "no-store",
      });
      if (!res.ok) return { done: false };

      const data = (await res.json()) as StatusResponse;
      setJobStatus(data.status);

      if (data.status === "READY") {
        setIsReadyHere(true);
        await fetchPreview(currentJobId);

        toast.success("Research complete", {
          description: "Open the full results to continue.",
          action: {
            label: "View results",
            onClick: () => router.push(`/keywords/${currentJobId}`),
          },
        });

        return { done: true };
      }
      return { done: data.status === "FAILED" };
    } catch {
      return { done: false };
    }
  }

  function scheduleNextPoll(intervalMs: number) {
    if (pollTimer.current) clearTimeout(pollTimer.current);
    pollTimer.current = setTimeout(async () => {
      if (!jobId) return;
      const { done } = await pollOnce(jobId);
      if (done) return;
      const next = Math.min(intervalMs * 1.25, 8000);
      scheduleNextPoll(next);
    }, intervalMs);
  }

  useEffect(() => {
    if (!jobId) return;
    (async () => {
      const first = await pollOnce(jobId);
      if (!first.done) scheduleNextPoll(2000);
    })();
    return () => {
      if (pollTimer.current) clearTimeout(pollTimer.current);
    };
  }, [jobId]); // eslint-disable-line react-hooks/exhaustive-deps

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsSubmitting(true);
    setMessage(null);
    setIsReadyHere(false);
    setJobStatus("RUNNING");
    setJobId(null);
    setArticles([]);
    setSupporting({ top: [], rising: [], all: [] });
    setSelectedArticleIds([]);
    setSelectedTopics([]);

    const payload = {
      topic,
      country,
      region,
      location: computeLocationString(country, region),
      clusterId: clusterId || undefined,
    };

    try {
      const res = await fetch("/api/research", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Failed to start research");

      const newJobId: string = data?.jobId;
      if (!newJobId) throw new Error("Started research but no jobId returned.");

      const url = new URL(window.location.href);
      url.searchParams.set("jobId", newJobId);
      window.history.replaceState({}, "", url);

      setJobId(newJobId);
      setMessage("Research started. We’ll show results here and you can open the full report when it’s ready.");

      toast.message("Research started", {
        description: "We’ll notify you here when it’s ready.",
      });
    } catch (err: any) {
      setMessage(err.message || "Something went wrong.");
    } finally {
      setIsSubmitting(false);
    }
  }

  const showGear = jobStatus === "RUNNING" || jobStatus === "QUEUED";

  return (
    <main className="mx-auto max-w-3xl px-6 py-10">
      {/* Header */}
      <div className="rounded-3xl border border-white/40 bg-white/70 p-6 shadow backdrop-blur">
        <div className="mb-5 flex items-center justify-between">
          <h1 className="text-xl font-semibold text-slate-900">Research</h1>
          <Link href="/dashboard" className="text-sm font-semibold text-blue-600 hover:underline">
            Back to Dashboard
          </Link>
        </div>

        {/* Info Box */}
        <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
          <p className="text-sm font-semibold text-slate-900">How this step works</p>
          <ul className="mt-2 space-y-1.5 text-sm text-slate-700">
            <li>• Enter a topic/niche and choose country + region (or “All”).</li>
            <li>• We fetch fresh news sources & trending angles.</li>
            <li>• You’ll get draft options with <strong>sources</strong>.</li>
            <li>• Next step: expand to blog/cluster and repurpose to socials.</li>
          </ul>
        </div>

        {/* Form */}
        <form onSubmit={onSubmit} className="mt-5 space-y-5">
          <div>
            <label className="block text-sm font-medium text-slate-700">Topic / Niche</label>
            <input
              className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:ring-2 focus:ring-blue-600"
              placeholder="Enter your topic or niche"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              required
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-slate-700">Country</label>
              <select
                className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm"
                value={country}
                onChange={(e) => {
                  const next = e.target.value as "GLOBAL" | "US" | "CA";
                  setCountry(next);
                  setRegion("ALL");
                }}
              >
                <option value="GLOBAL">Global</option>
                <option value="US">United States</option>
                <option value="CA">Canada</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700">State / Province</label>
              <select
                className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm disabled:opacity-50"
                value={region}
                onChange={(e) => setRegion(e.target.value)}
                disabled={country === "GLOBAL"}
              >
                {country === "GLOBAL" ? (
                  <option value="ALL">All (Global)</option>
                ) : (
                  regionOptions.map((r) => (
                    <option key={r.value} value={r.value}>
                      {r.label}
                    </option>
                  ))
                )}
              </select>
            </div>
          </div>

          {clusterId ? (
            <p className="text-xs text-slate-500">
              Results linked to cluster <span className="font-medium">{clusterId}</span>.
            </p>
          ) : null}

          <div className="flex flex-wrap items-center gap-3">
            <button
              disabled={isSubmitting}
              className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-blue-700 disabled:opacity-50"
            >
              {isSubmitting ? "Starting…" : "Start Research"}
            </button>
            <Link href="/dashboard" className="text-sm font-semibold text-slate-600 hover:text-slate-800">
              Cancel
            </Link>

            {jobId && isReadyHere && (
              <button
                type="button"
                onClick={() => router.push(`/keywords/${jobId}`)}
                className="rounded-xl border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                View full results
              </button>
            )}
          </div>

          {message ? <p className="text-sm text-slate-700">{message}</p> : null}
        </form>
      </div>

      {/* Results Panel */}
      <section className="mt-8">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-900">Results</h2>
          {jobId ? (
            <button
              type="button"
              disabled={!isReadyHere}
              onClick={() => router.push(`/keywords/${jobId}`)}
              className="inline-flex items-center gap-1 text-sm font-semibold text-blue-600 hover:underline disabled:cursor-not-allowed disabled:text-slate-400"
            >
              Open full view →
            </button>
          ) : null}
        </div>

        {/* Status line */}
        <div
          className={`mb-4 rounded-lg border px-3 py-2 text-sm ${
            jobStatus === "READY"
              ? "border-emerald-200 bg-emerald-50/60 text-emerald-800"
              : "border-amber-200 bg-amber-50/60 text-amber-800"
          }`}
        >
          {jobId ? (
            jobStatus === "READY" ? (
              <span>Ready — preview loaded below.</span>
            ) : (
              <span>Waiting for results… this section will update automatically. Status: {jobStatus}</span>
            )
          ) : (
            <span>Start a research to see results here.</span>
          )}
        </div>

        {/* ARTICLES FIRST */}
        {articles.length > 0 && (
          <div className="mb-8 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-base font-semibold text-slate-900">News Articles (pick up to 3)</h3>
              <span className="text-xs text-slate-500">
                Selected: {selectedArticleIds.length} / 3
              </span>
            </div>

            <ul className="space-y-3">
              {articles.map((a) => {
                const selected = selectedArticleIds.includes(a.id);
                return <ArticleRow key={a.id} a={a} selected={selected} onToggle={() => setSelectedArticleIds((prev) => toggleWithLimit(prev, a.id, 3))} />;
              })}
            </ul>
          </div>
        )}

        {/* SUPPORTING TOPICS NEXT */}
        {(supporting.top.length + supporting.rising.length + supporting.all.length > 0) && (
          <div className="mb-8 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-base font-semibold text-slate-900">Supporting Blog Topics (pick up to 5)</h3>
              <span className="text-xs text-slate-500">Selected: {selectedTopics.length} / 5</span>
            </div>

            <TopicGroup
              title="Top"
              items={supporting.top}
              selected={selectedTopics}
              onToggle={(label) => setSelectedTopics((prev) => toggleWithLimit(prev, label, 5))}
            />
            <TopicGroup
              title="Rising"
              items={supporting.rising}
              selected={selectedTopics}
              onToggle={(label) => setSelectedTopics((prev) => toggleWithLimit(prev, label, 5))}
            />
            <TopicGroup
              title="All"
              items={supporting.all}
              selected={selectedTopics}
              onToggle={(label) => setSelectedTopics((prev) => toggleWithLimit(prev, label, 5))}
            />
          </div>
        )}
      </section>

      <LoadingOverlay show={showGear} />
    </main>
  );
}

/* ---------------- UI Subcomponents ---------------- */

function ArticleRow({
  a,
  selected,
  onToggle,
}: {
  a: PreviewArticle;
  selected: boolean;
  onToggle: () => void;
}) {
  const [open, setOpen] = useState(false);
  const date = a.publishedTime ? new Date(a.publishedTime) : null;

  return (
    <li className="rounded-xl border border-slate-200 p-3 shadow-sm">
      <div className="flex items-start gap-3">
        <button
          type="button"
          onClick={onToggle}
          className={`mt-0.5 inline-flex h-5 w-5 items-center justify-center rounded border text-xs ${
            selected
              ? "border-blue-600 bg-blue-600 text-white"
              : "border-slate-300 bg-white text-slate-500 hover:bg-slate-50"
          }`}
          aria-pressed={selected}
        >
          {selected ? "✓" : ""}
        </button>

        <div className="min-w-0 flex-1">
          <a
            href={a.url}
            target="_blank"
            rel="noopener noreferrer"
            className="line-clamp-2 text-sm font-semibold text-slate-900 hover:underline"
            title={a.title || a.url}
          >
            {a.title || a.url}
          </a>
          <div className="mt-0.5 text-xs text-slate-500">
            {a.sourceName ? <span>{a.sourceName}</span> : null}
            {date ? <span> • {date.toLocaleString()}</span> : null}
          </div>

          {a.snippet ? (
            <div className="mt-2">
              <button
                type="button"
                onClick={() => setOpen((v) => !v)}
                className="text-xs font-semibold text-blue-600 hover:underline"
              >
                {open ? "Hide summary" : "Show summary"}
              </button>
              {open ? (
                <p className="mt-1 whitespace-pre-wrap text-sm text-slate-700">{a.snippet}</p>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>
    </li>
  );
}

function TopicGroup({
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
  if (!items?.length) return null;
  return (
    <div className="mb-4">
      <div className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-500">{title}</div>
      <div className="flex flex-wrap gap-2">
        {items.map((label) => {
          const isSel = selected.includes(label);
          return (
            <button
              key={`${title}:${label}`}
              type="button"
              onClick={() => onToggle(label)}
              className={`rounded-full border px-3 py-1 text-sm ${
                isSel
                  ? "border-blue-600 bg-blue-50 text-blue-700"
                  : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
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