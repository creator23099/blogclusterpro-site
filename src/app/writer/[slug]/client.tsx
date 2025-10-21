"use client";
import { useState } from "react";

export default function Editor({
  slug,
  initial,
}: {
  slug: string;
  initial: { content: string; seoTitle: string; seoDesc: string; summary?: string };
}) {
  const [content, setContent] = useState(initial.content);
  const [seoTitle, setSeoTitle] = useState(initial.seoTitle);
  const [seoDesc, setSeoDesc] = useState(initial.seoDesc);
  const [summary, setSummary] = useState(initial.summary || "");
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    const res = await fetch("/api/drafts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        slug,
        content,
        status: "READY",
        seoTitle,
        seoDesc,
        summary,
      }),
    });

    setSaving(false);
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      alert(`Save failed: ${j.error || res.statusText}`);
      return;
    }
    alert("Saved successfully!");
  }

  return (
    <main className="p-6 space-y-3">
      <h1 className="text-xl font-semibold">Edit: {slug}</h1>

      <input
        className="border p-2 w-full"
        placeholder="SEO Title"
        value={seoTitle}
        onChange={(e) => setSeoTitle(e.target.value)}
      />

      <input
        className="border p-2 w-full"
        placeholder="Meta Description"
        value={seoDesc}
        onChange={(e) => setSeoDesc(e.target.value)}
      />

      <textarea
        className="border p-2 w-full"
        placeholder="Optional Summary"
        value={summary}
        onChange={(e) => setSummary(e.target.value)}
      />

      <textarea
        className="border p-2 w-full h-[60vh]"
        placeholder="Markdown content…"
        value={content}
        onChange={(e) => setContent(e.target.value)}
      />

      <button
        className="border px-3 py-2 rounded"
        onClick={save}
        disabled={saving}
      >
        {saving ? "Saving..." : "Save"}
      </button>
    </main>
  );
}