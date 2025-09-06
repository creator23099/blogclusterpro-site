"use client";

import { useState } from "react";
import { Card } from "@/components/Card";

export default function AccordionGroup({
  heading,
  items,
}: {
  heading: string;
  items: { q: string; a: string }[];
}) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <Card className="p-0">
      <div className="border-b border-slate-200/70 bg-bc-bg px-5 py-3">
        <h2 className="text-lg font-semibold text-bc-ink">{heading}</h2>
      </div>

      <div className="divide-y divide-slate-200/70">
        {items.map((item, i) => {
          const isOpen = openIndex === i;
          return (
            <div key={item.q} className={`px-5 py-4 transition ${isOpen ? "bg-bc-primary/5" : ""}`}>
              <button
                type="button"
                aria-expanded={isOpen}
                aria-controls={`faq-panel-${heading}-${i}`}
                onClick={() => setOpenIndex(isOpen ? null : i)}
                className="flex w-full items-start justify-between gap-4 text-left"
              >
                <h3 className="text-base font-semibold text-bc-ink">{item.q}</h3>
                <span className={`select-none text-bc-primary transition ${isOpen ? "rotate-45" : ""}`}>
                  ＋
                </span>
              </button>

              {isOpen && (
                <div
                  id={`faq-panel-${heading}-${i}`}
                  className="mt-2 text-[15px] leading-relaxed text-bc-subink"
                >
                  {item.a}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </Card>
  );
}