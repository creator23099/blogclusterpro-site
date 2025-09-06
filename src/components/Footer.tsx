// src/components/Footer.tsx
"use client";

import React from "react";
import Link from "@/components/Link";

export default function Footer() {
  return (
    <footer className="bg-bc-navy text-slate-200">
      <div className="mx-auto max-w-7xl px-6 py-12 grid gap-8 md:grid-cols-3">
        
        {/* Brand */}
        <div>
          <h3 className="text-lg font-bold text-white">BlogCluster Pro</h3>
          <p className="mt-2 text-sm text-slate-400">
            Research-backed clusters. Technical SEO done for you. 
            Publish fast, rank faster.
          </p>
        </div>

        {/* Quick Links */}
        <div>
          <h4 className="font-semibold text-white">Company</h4>
          <ul className="mt-2 space-y-2 text-sm">
            <li><Link href="/about" className="hover:text-white">About</Link></li>
            <li><Link href="/pricing" className="hover:text-white">Pricing</Link></li>
            <li><Link href="/faq" className="hover:text-white">FAQ</Link></li>
          </ul>
        </div>

        {/* CTA */}
        <div>
          <h4 className="font-semibold text-white">Get Started</h4>
          <p className="mt-2 text-sm text-slate-400">
            Join 100+ SMBs publishing smarter with BlogCluster Pro.
          </p>
          <Link
            href="/pricing"
            className="mt-4 inline-block rounded-md bg-bc-primary px-4 py-2 text-sm font-semibold text-white shadow hover:bg-bc-primary-hover"
          >
            View Pricing →
          </Link>
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="border-t border-slate-700 px-6 py-4 text-center text-xs text-slate-500">
        © {new Date().getFullYear()} BlogCluster Pro · All rights reserved.
      </div>
    </footer>
  );
}
