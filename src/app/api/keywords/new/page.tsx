// src/app/api/keywords/new/page.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function NewKeywordJobPage() {
  const [niche, setNiche] = useState("chiropractor back pain");
  const [location, setLocation] = useState("California");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch("/api/keywords", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ niche, location }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Failed to queue job");
      router.push(`/keywords/${data.jobId}`);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-xl mx-auto p-6 space-y-4">
      <h1 className="text-2xl font-semibold">Run Keyword Job</h1>
      <form onSubmit={onSubmit} className="space-y-3">
        <label className="block">
          <span className="text-sm">Niche</span>
          <input
            className="mt-1 w-full border rounded p-2"
            value={niche}
            onChange={(e) => setNiche(e.target.value)}
            required
          />
        </label>
        <label className="block">
          <span className="text-sm">Location (optional)</span>
          <input
            className="mt-1 w-full border rounded p-2"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
          />
        </label>
        <button
          className="rounded bg-blue-600 text-white px-4 py-2 disabled:opacity-60"
          disabled={loading}
        >
          {loading ? "Queuing…" : "Start"}
        </button>
      </form>
    </div>
  );
}