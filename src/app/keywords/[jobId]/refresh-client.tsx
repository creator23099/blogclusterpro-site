// src/app/keywords/[jobId]/refresh-client.tsx
"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

export default function AutoRefresh({
  enabled,
  intervalMs = 5000,
  maxMs = 120000,
}: {
  enabled: boolean;
  intervalMs?: number;
  maxMs?: number;
}) {
  const router = useRouter();
  const startedAt = useRef<number | null>(null);

  useEffect(() => {
    if (!enabled) return;
    let timer: any;

    const tick = () => {
      if (startedAt.current == null) startedAt.current = Date.now();
      const elapsed = Date.now() - startedAt.current;
      router.refresh();
      if (elapsed + intervalMs < maxMs) {
        timer = setTimeout(tick, intervalMs);
      }
    };

    timer = setTimeout(tick, intervalMs);
    return () => clearTimeout(timer);
  }, [enabled, intervalMs, maxMs, router]);

  return null;
}