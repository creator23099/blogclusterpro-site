import { Suspense } from "react";
import ResearchClient from "./research-client";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export default function Page() {
  return (
    <Suspense fallback={<div className="p-6">Loading research UI…</div>}>
      <ResearchClient />
    </Suspense>
  );
}