"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "@/components/Link";
import InlineResults, { type Suggestion } from "./InlineResults";

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
};

const SS_KEY = "bcp_research_cache";

export default function ResearchClient() {
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
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const pollTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const regionOptions = useMemo(() => (country === "GLOBAL" ? [] : REGIONS[country] || []), [country]);

  function computeLocationString(c: string, r: string) {
    if (c === "GLOBAL") return "GLOBAL";
    if (!r || r === "ALL") return c;
    return `${c}:${r}`;
  }

  function persistToSession(next: { jobId: string; status: string; suggestions: Suggestion[] }) {
    try {
      sessionStorage.setItem(SS_KEY, JSON.stringify(next));
    } catch {}
  }
  function restoreFromSession():
    | { jobId: string; status: StatusResponse["status"]; suggestions: Suggestion[] }
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
      setSuggestions([]); // keep lightweight here
      restored = true;
    } else {
      const cache = restoreFromSession();
      if (cache?.jobId) {
        setJobId(cache.jobId);
        setJobStatus(cache.status);
        setSuggestions(cache.suggestions || []);
        restored = true;
      }
    }

    if (!restored) return;
    // polling starts in the jobId effect
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!jobId) return;
    persistToSession({ jobId, status: jobStatus, suggestions });
  }, [jobId, jobStatus, suggestions]);

  // Poll status endpoint and redirect when READY
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
        window.location.href = `/keywords/${currentJobId}`;
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
  }, [jobId]);

  const showGear = jobStatus === "RUNNING" || jobStatus === "QUEUED";

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsSubmitting(true);
    setMessage(null);
    setSuggestions([]);
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
      setMessage("Research started. We’ll show results here as soon as they arrive.");
    } catch (err: any) {
      setMessage(err.message || "Something went wrong.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="mx-auto max-w-3xl px-6 py-10">
      <div className="rounded-3xl border border-white/40 bg-white/70 p-6 shadow-[0_10px_40px_-20px_rgba(2,6,23,0.25)] backdrop-blur">
        <div className="mb-5 flex items-center justify-between">
          <h1 className="text-xl font-semibold text-slate-900">Research</h1>
          <div className="flex items-center gap-2">
            <Link href="/dashboard" className="text-sm font-semibold text-bc-subink hover:text-bc-ink">
              Back to Dashboard
            </Link>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
          <p className="text-sm font-semibold text-slate-900">How this step works</p>
          <ul className="mt-2 space-y-1.5 text-sm text-slate-700">
            <li>• Enter a topic/niche and choose country + region (or “All”).</li>
            <li>• We fetch fresh news sources & trending angles.</li>
            <li>• You’ll get draft options with <strong>sources</strong> to help writing.</li>
            <li>• Next step: expand to a blog/cluster and repurpose to socials.</li>
          </ul>
        </div>

        <form onSubmit={onSubmit} className="mt-5 space-y-5">
          <div>
            <label className="block text-sm font-medium text-slate-700">Topic / Niche</label>
            <input
              className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-600"
              placeholder="e.g., fitness creators on TikTok, crypto regulation, Apple AI"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              required
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-slate-700">Country</label>
              <select
                className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-600"
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
                className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-600 disabled:opacity-50"
                value={region}
                onChange={(e) => setRegion(e.target.value)}
                disabled={country === "GLOBAL"}
              >
                {country === "GLOBAL" ? (
                  <option value="ALL">All (Global)</option>
                ) : (
                  (regionOptions || []).map((r) => (
                    <option key={r.value} value={r.value}>
                      {r.label}
                    </option>
                  ))
                )}
              </select>
              <p className="mt-1 text-xs text-slate-500">Choose “All” for a country-wide search.</p>
            </div>
          </div>

          {clusterId ? (
            <p className="text-xs text-slate-500">
              Results will be associated with cluster <span className="font-medium">{clusterId}</span>.
            </p>
          ) : null}

          <div className="flex items-center gap-3">
            <button
              disabled={isSubmitting}
              className="inline-flex items-center justify-center rounded-xl px-4 py-2 text-sm font-semibold shadow-lg transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 disabled:opacity-50"
              style={{ backgroundColor: "#2563eb", color: "#ffffff" }}
            >
              {isSubmitting ? "Starting…" : "Start Research"}
            </button>
            <Link href="/dashboard" className="text-sm font-semibold text-bc-subink hover:text-bc-ink">
              Cancel
            </Link>
          </div>

          {message ? <p className="text-sm text-slate-700">{message}</p> : null}
        </form>
      </div>

      {jobId ? (
        <InlineResults
          jobId={jobId}
          status={jobStatus}
          suggestions={suggestions}
          topics={{
            // placeholder until wired from /api/research/job/[id]
            top: ["AI for creators", "Short-form SEO"],
            rising: ["YouTube Shorts tips"],
            all: ["content hubs", "pillar pages"],
          }}
          maxSelectable={3}
        />
      ) : null}

      <LoadingOverlay show={showGear} label="Running research…" />
    </main>
  );
}