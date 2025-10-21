"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import Link from "@/components/Link";
import InlineResults, { type Suggestion } from "./InlineResults";

/** Local type for session caching only (InlineResults fetches topics itself) */
type Topics = { top: string[]; rising: string[]; all: string[] };

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

type StatusResponse = {
  ok: boolean;
  jobId: string;
  status: "QUEUED" | "RUNNING" | "READY" | "FAILED" | string;
};

const SS_KEY = "bcp_research_cache";

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

  // Inline preview state (used for session cache + placeholder rows)
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [topics, setTopics] = useState<Topics>({ top: [], rising: [], all: [] });

  const [isReadyHere, setIsReadyHere] = useState(false);
  const pollTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const regionOptions = useMemo(() => (country === "GLOBAL" ? [] : REGIONS[country] || []), [country]);

  function computeLocationString(c: string, r: string) {
    if (c === "GLOBAL") return "GLOBAL";
    if (!r || r === "ALL") return c;
    return `${c}:${r}`;
  }

  // Persist & restore
  function persistToSession(next: {
    jobId: string;
    status: string;
    suggestions: Suggestion[];
    topics: Topics;
  }) {
    try {
      sessionStorage.setItem(SS_KEY, JSON.stringify(next));
    } catch {}
  }
  function restoreFromSession():
    | { jobId: string; status: StatusResponse["status"]; suggestions: Suggestion[]; topics: Topics }
    | null {
    try {
      const raw = sessionStorage.getItem(SS_KEY);
      if (!raw) return null;
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }

  // Fetch inline preview (5 articles + grouped topics)
  async function fetchPreview(currentJobId: string) {
    try {
      const res = await fetch(`/api/research/preview?jobId=${encodeURIComponent(currentJobId)}`, {
        method: "GET",
        headers: { "Cache-Control": "no-store" },
        credentials: "include",
      });
      if (!res.ok) return;
      const data = await res.json();
      // preview returns: { articles: [...], supportingTopics: { top, rising, all } }
      const mapped: Suggestion[] = (data?.articles || []).map((a: any) => ({
        id: a.id,
        keyword: a.title || a.url,
        score: a.relevanceScore ?? null,
        sourceUrl: a.url ?? null,
        newsUrls: [a.url].filter(Boolean),
        newsMeta: [{ url: a.url, summary: a.snippet ?? null }],
        createdAt: a.publishedTime || new Date().toISOString(),
        // @ts-ignore allow passthrough for InlineResults to show friendly brand via fallback
        sourceName: a.sourceName || null,
      }));
      setSuggestions(mapped);
      setTopics({
        top: data?.supportingTopics?.top || [],
        rising: data?.supportingTopics?.rising || [],
        all: data?.supportingTopics?.all || [],
      });
    } catch {
      // ignore preview errors so the page still works
    }
  }

  useEffect(() => {
    let restored = false;
    if (qsJobId) {
      setJobId(qsJobId);
      setJobStatus("RUNNING");
      setSuggestions([]);
      setTopics({ top: [], rising: [], all: [] });
      setIsReadyHere(false);
      restored = true;
      // try to pre-load preview if it already exists
      fetchPreview(qsJobId);
    } else {
      const cache = restoreFromSession();
      if (cache?.jobId) {
        setJobId(cache.jobId);
        setJobStatus(cache.status);
        setSuggestions(cache.suggestions || []);
        setTopics(cache.topics || { top: [], rising: [], all: [] });
        setIsReadyHere(cache.status === "READY");
        restored = true;
      }
    }
    if (!restored) return;
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!jobId) return;
    persistToSession({ jobId, status: jobStatus, suggestions, topics });
  }, [jobId, jobStatus, suggestions, topics]);

  // Poller — DO NOT redirect. Show toast + inline button.
  async function pollOnce(currentJobId: string) {
    try {
      const res = await fetch(`/api/research/status?jobId=${encodeURIComponent(currentJobId)}`, {
        method: "GET",
        headers: { "Cache-Control": "no-store" },
        credentials: "include",
      });
      if (!res.ok) return { done: false };
      const data = (await res.json()) as StatusResponse;
      setJobStatus(data.status);

      if (data.status === "READY") {
        setIsReadyHere(true);
        // load inline preview now that job is done
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
    setSuggestions([]);
    setTopics({ top: [], rising: [], all: [] });
    setIsReadyHere(false);
    setJobStatus("RUNNING");
    setJobId(null);

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

      toast.message("Research started", { description: "We’ll notify you here when it’s ready." });
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

          <div className="flex items-center gap-3">
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

      {jobId ? (
        <InlineResults
          jobId={jobId}
          status={jobStatus}
          suggestions={suggestions}
          /* topics are fetched inside InlineResults */
          maxSelectable={3}
        />
      ) : null}

      {/* tiny loader in the corner */}
      {(jobStatus === "RUNNING" || jobStatus === "QUEUED") && (
        <div className="pointer-events-none fixed bottom-4 right-4 z-[80]">
          <div className="pointer-events-auto rounded-xl border border-slate-200 bg-white/95 px-4 py-2 shadow-lg ring-1 ring-black/5">
            <div className="flex items-center gap-2">
              <svg className="h-5 w-5 animate-spin" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                <path d="M11 2h2v3h-2V2Zm6.657 2.343 1.414 1.414-2.122 2.121-1.414-1.414 2.122-2.121ZM2 11h3v2H2v-2Zm16.95 1a6.95 6.95 0 1 1-13.9 0 6.95 6.95 0 0 1 13.9 0Zm.808 6.243-2.122-2.121 1.414-1.415 2.122 2.122-1.414 1.414ZM11 19h2v3h-2v-3ZM4.05 18.657l-1.414-1.414 2.122-2.122 1.414 1.415-2.122 2.121ZM4.05 5.343 6.172 7.465 4.758 8.88 2.636 6.757 4.05 5.343Z" />
              </svg>
              <span className="text-sm font-medium text-slate-700">Running research…</span>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}