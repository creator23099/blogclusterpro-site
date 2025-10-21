"use client";
import { useState } from "react";

export default function RunButton() {
  const [loading, setLoading] = useState(false);

  async function run() {
    try {
      setLoading(true);
      await fetch("/api/internal/run-n8n", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      }).then(r => r.json()).catch(() => ({}));

      // simple refresh to show new posts once n8n finishes
      window.location.reload();
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      onClick={run}
      disabled={loading}
      className="border px-3 py-2 rounded"
      aria-busy={loading}
    >
      {loading ? "Starting…" : "Write (run n8n)"}
    </button>
  );
}