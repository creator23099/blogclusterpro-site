// src/components/Navbar.tsx
"use client";

import Link from "@/components/Link"; // ✅ use your passthrough wrapper
import { usePathname } from "next/navigation";
import { SignedIn, SignedOut, UserButton, ClerkLoaded, ClerkLoading } from "@clerk/nextjs";

type NavItem = { href: string; label: string };

const NAV_ITEMS: NavItem[] = [
  { href: "/features", label: "Features" },
  { href: "/pricing", label: "Pricing" },
  { href: "/about", label: "About" },
  { href: "/faq", label: "FAQ" },
];

export default function Navbar() {
  const pathname = usePathname();

  return (
    <header
      className="sticky top-0 z-50 border-b border-slate-200"
      style={{ backgroundColor: "#f8f6f1" }}
    >
      <div className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between px-5 md:px-8">
        {/* Brand */}
        <Link
          href="/"
          className="group inline-flex items-center gap-2 font-semibold tracking-tight"
          aria-label="BlogCluster Pro Home"
        >
          <span className="inline-block h-7 w-7 rounded-md bg-bc-primary transition-transform group-hover:rotate-6" />
          <span>
            BlogCluster <span className="text-bc-primary">Pro</span>
          </span>
        </Link>

        {/* Desktop nav + auth */}
        <nav className="hidden items-center gap-7 md:flex">
          {NAV_ITEMS.map((item) => {
            const active =
              item.href === "/" ? pathname === "/" : pathname?.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 rounded ${
                  active ? "text-bc-ink" : "text-bc-subink hover:text-bc-ink"
                }`}
                aria-current={active ? "page" : undefined}
                prefetch={false}
              >
                {item.label}
              </Link>
            );
          })}

          {/* Auth (desktop) — render only after Clerk has loaded to avoid hydration drift */}
          <ClerkLoaded>
            <SignedOut>
              <Link
                href="/sign-in"
                className="text-sm font-semibold text-bc-subink hover:text-bc-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 rounded"
              >
                Sign in
              </Link>
              <Link
                href="/sign-up"
                className="inline-flex items-center rounded-xl bg-bc-primary px-4 py-2 text-sm font-semibold text-white shadow transition hover:bg-bc-primaryHover focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-bc-ring"
              >
                Get Started
              </Link>
            </SignedOut>

            <SignedIn>
              <Link
                href="/dashboard"
                className="text-sm font-semibold text-bc-subink hover:text-bc-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 rounded"
              >
                Dashboard
              </Link>

              <UserButton
                afterSignOutUrl="/"
                appearance={{
                  elements: {
                    userButtonTrigger:
                      "rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-600",
                    userButtonAvatarBox:
                      "h-9 w-9 rounded-full ring-1 ring-slate-200 shadow-sm",
                    userButtonPopoverCard:
                      "rounded-2xl border border-slate-200 shadow-xl",
                    userButtonPopoverFooter: "rounded-b-2xl",
                    userButtonPopoverActions: "gap-1",
                    userButtonPopoverActionButton: "rounded-lg hover:bg-slate-50",
                  },
                  variables: { colorPrimary: "#2563eb" },
                }}
              />
            </SignedIn>
          </ClerkLoaded>

          {/* While Clerk initializes, render a deterministic placeholder to keep SSR/CSR in sync */}
          <ClerkLoading>
            <div className="h-9 w-28 rounded bg-slate-200 animate-pulse" aria-hidden />
          </ClerkLoading>
        </nav>
      </div>
    </header>
  );
}