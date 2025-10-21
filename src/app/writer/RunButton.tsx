"use client";
import { useState } from "react";

export default function RunButton({
  jobId,
  topics = [],
  articles = [],
}: {
  jobId?: string;
  topics?: string[];
  articles?: string[];
}) {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function runFormatter() {
    try {
      setLoading(true);
      setMessage(null);

      const res = await fetch("/api/internal/n8n/outline/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jobId: jobId || "draft_" + Date.now(),
          topics,
          articles,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        console.error("Formatter error:", data);
        setMessage(`❌ Error: ${data.error || data.upstream || "Failed to trigger outline flow"}`);
      } else {
        console.log("Formatter triggered:", data);
        setMessage("✅ Outline generation started in n8n!");
      }
    } catch (err: any) {
      console.error("Draft Outlines exception:", err);
      setMessage(`💥 ${err.message}`);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mt-4">
      <button
        onClick={runFormatter}
        disabled={loading}
        className="px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700 disabled:bg-gray-400"
        aria-busy={loading}
      >
        {loading ? "Starting…" : "Draft Outlines"}
      </button>
      {message && (
        <div className="mt-2 text-sm text-gray-700">{message}</div>
      )}
    </div>
  );
}