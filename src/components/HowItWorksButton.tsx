// src/components/HowItWorksButton.tsx
"use client";

import Link from "next/link";
import { Popover, Transition } from "@headlessui/react";
import { Fragment, useId, useRef } from "react";
import { XMarkIcon, CheckCircleIcon } from "@heroicons/react/24/solid";

type Props = {
  className?: string;
  children?: React.ReactNode; // defaults to "Learn how it works"
  variant?: "blue" | "outline";
};

export default function HowItWorksButton({
  className = "",
  children = "Learn how it works",
  variant = "blue",
}: Props) {
  const triggerId = useId();
  const triggerRef = useRef<HTMLButtonElement>(null);

  const base =
    "inline-flex items-center justify-center rounded-md px-3 py-1.5 text-sm font-semibold shadow-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600";
  const styles =
    variant === "blue"
      ? `${base} text-white bg-blue-600 hover:bg-blue-700`
      : `${base} border border-slate-200 bg-white text-slate-700 hover:bg-slate-50`;

  return (
    <Popover className={`relative ${className}`}>
      {({ open, close }) => (
        <>
          <Popover.Button id={triggerId} ref={triggerRef} className={styles}>
            {children}
          </Popover.Button>

          {/* No full-screen overlay. Keep page clickable. */}
          <Transition
            as={Fragment}
            show={open}
            enter="transition ease-out duration-200"
            enterFrom="opacity-0 translate-y-1"
            enterTo="opacity-100 translate-y-0"
            leave="transition ease-in duration-150"
            leaveFrom="opacity-100 translate-y-0"
            leaveTo="opacity-0 translate-y-1"
          >
            {/* Panel anchored to the button; does not cover the page */}
            <Popover.Panel
              static
              className="absolute z-50 mt-2 w-[min(92vw,420px)] -translate-x-1/2 left-1/2 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-2xl ring-1 ring-black/5"
            >
              {/* Header */}
              <div className="mb-1.5 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-slate-900">
                  How BlogCluster Pro Works
                </h3>
                <button
                  onClick={() => close()}
                  className="rounded p-1 text-slate-500 hover:bg-slate-100 hover:text-slate-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
                  aria-label="Close"
                >
                  <XMarkIcon className="h-5 w-5" />
                </button>
              </div>

              {/* Intro */}
              <p className="text-xs text-slate-600 mb-2">
                From trending topics → publish-ready draft with repurpose options.
              </p>

              {/* Steps */}
              <ul className="space-y-1.5">
                {[
                  "Select location and niche to guide research.",
                  "We fetch fresh sources & trending angles.",
                  "Write blog or cluster with citations.",
                  "Pick repurpose mode (summary, insight, market, thread, SEO).",
                  "Publish & schedule to socials.",
                ].map((t, i) => (
                  <li
                    key={i}
                    className="flex gap-2 text-[13px] leading-5 text-slate-700"
                  >
                    <CheckCircleIcon className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
                    <span>{t}</span>
                  </li>
                ))}
              </ul>

              {/* Actions */}
              <div className="mt-3 flex justify-end gap-2">
                <button
                  onClick={() => close()}
                  className="rounded-md border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
                >
                  Close
                </button>
                <Link
                  href="/research"
                  onClick={() => close()}
                  className="rounded-md bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-blue-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
                >
                  Start Research
                </Link>
              </div>
            </Popover.Panel>
          </Transition>
        </>
      )}
    </Popover>
  );
}