// src/components/Hero.tsx
import Link from "@/components/Link";

type CTA = { href: string; label: string; };
type Props = {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  primary?: CTA;
  secondary?: CTA;
};

export default function Hero({
  eyebrow,
  title,
  subtitle,
  primary,
  secondary,
}: Props) {
  return (
    <section className="relative overflow-hidden border-b border-slate-200/60 bg-white">
      {/* soft gradient background */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(80%_60%_at_30%_0%,rgba(37,99,235,0.12),transparent_60%),radial-gradient(70%_50%_at_80%_20%,rgba(37,99,235,0.10),transparent_65%)]"
      />
      <div className="relative mx-auto max-w-7xl px-5 py-16 md:px-8 md:py-24">
        {eyebrow && (
          <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-bc-primary/10 px-3 py-1 text-sm font-medium text-bc-primary">
            <span className="h-2 w-2 rounded-full bg-bc-primary" />
            {eyebrow}
          </div>
        )}

        <h1 className="max-w-3xl text-4xl font-bold tracking-tight text-bc-ink md:text-6xl">
          {title}
        </h1>

        {subtitle && (
          <p className="mt-4 max-w-2xl text-lg text-bc-subink md:text-xl">
            {subtitle}
          </p>
        )}

        {(primary || secondary) && (
          <div className="mt-8 flex flex-wrap items-center gap-3">
            {primary && (
              <Link
                href={primary.href}
                className="inline-flex items-center justify-center rounded-xl bg-bc-primary px-5 py-2.5 font-semibold text-white shadow transition hover:bg-bc-primary-hover focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-bc-ring"
              >
                {primary.label}
              </Link>
            )}
            {secondary && (
              <Link
                href={secondary.href}
                className="inline-flex items-center justify-center rounded-xl border border-slate-300/80 bg-white px-5 py-2.5 font-semibold text-bc-ink shadow-sm transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-bc-ring"
              >
                {secondary.label}
              </Link>
            )}
          </div>
        )}
      </div>
    </section>
  );
}