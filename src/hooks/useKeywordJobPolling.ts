"use client";

import { useEffect, useRef, useState } from "react";

export type Suggestion = {
  id: string;
  keyword: string;
  score: number | null;
  sourceUrl: string | null;
  newsUrls: string[];
  createdAt: string;
};

export type JobPayload = {
  job: {
    id: string;
    topic: string | null;
    status: "QUEUED" | "RUNNING" | "READY" | "FAILED";
    updatedAt: string;
  };
  suggestions: Suggestion[];
};

export function useKeywordJobPolling(jobId: string | null) {
  const [data, setData] = useState<JobPayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPolling, setIsPolling] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (!jobId) return;

    let timer: any;
    let stopped = false;
    setIsPolling(true);
    setError(null);

    const fetchOnce = async () => {
      abortRef.current?.abort();
      const ac = new AbortController();
      abortRef.current = ac;

      try {
        const res = await fetch(`/api/keywords/${jobId}`, {
          cache: "no-store",
          signal: ac.signal,
        });
        if (!res.ok) {
          const j = await res.json().catch(() => ({}));
          throw new Error(j?.error || `Status ${res.status}`);
        }
        const json = (await res.json()) as JobPayload;
        setData(json);

        const status = json.job.status;
        const hasSuggestions = (json.suggestions?.length ?? 0) > 0;

        // Keep polling while RUNNING and until suggestions show up
        const shouldContinue = status === "RUNNING" && !hasSuggestions;

        if (shouldContinue && !stopped) {
          timer = setTimeout(fetchOnce, 3000); // poll every 3s
        } else {
          setIsPolling(false);
        }
      } catch (e: any) {
        if (e?.name === "AbortError") return; // ignore
        setError(e?.message || "Failed to load");
        // back off a bit then retry (only while we have a jobId)
        if (!stopped) timer = setTimeout(fetchOnce, 4000);
      }
    };

    fetchOnce();

    return () => {
      stopped = true;
      clearTimeout(timer);
      abortRef.current?.abort();
      setIsPolling(false);
    };
  }, [jobId]);

  return { data, error, isPolling };
}