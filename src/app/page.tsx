// src/app/page.tsx
import Link from "@/components/Link";
import Section from "@/components/Section";
import Button from "@/components/Button";
import { Card } from "@/components/Card";

export default function HomePage() {
  return (
    <>
      <Hero />
      <Logos />

      {/* alt bg for density break */}
      <section className="bg-slate-50">
        <FeatureGrid />
      </section>

      {/* bold gradient pricing promo */}
      <PricingStrip />

      <HowItWorks />

      <section className="bg-slate-50">
        <WinsReport />
      </section>

      <Testimonials />

      <section className="bg-slate-50">
        <FAQ />
      </section>

      {/* high-contrast final CTA on dark brand */}
      <FinalCTA />
    </>
  );
}

/* =========================
   Sections
   ========================= */

function Hero() {
  return (
    <section className="relative">
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-white/70 via-transparent to-transparent" />
      <Section className="pb-10">
        <div className="grid items-center gap-8 md:grid-cols-2">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-bc-subink">
              New · Direct WordPress publishing
            </span>

            <h1 className="mt-4 text-4xl font-extrabold leading-tight tracking-tight text-bc-ink sm:text-5xl">
              Research-backed <span className="text-bc-primary">content clusters</span>, auto-published.
            </h1>

            <p className="mt-4 max-w-xl text-lg text-bc-subink">
              Generate authority-grade articles with citations, schema, internal linking, and one-click WordPress publishing.
              <strong> No keys, no tokens, no setup.</strong>
            </p>

            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <Link href="/get-started" className="inline-block">
                <Button size="lg">Get started — it’s simple</Button>
              </Link>
              <Link href="/demo" className="inline-block">
                <Button variant="outline" size="lg">Watch 2-min demo</Button>
              </Link>
            </div>

            <p className="mt-3 text-xs text-slate-500">
              Launch pricing — lock in your rate before we raise prices.
            </p>
          </div>

          {/* Right-side mock cluster card */}
          <Card className="overflow-hidden p-0">
            <div className="border-b border-slate-200/70 bg-bc-bg px-4 py-2 text-xs text-slate-600">
              Cluster · “Family Dentist · Austin, TX”
            </div>
            <div className="grid gap-3 p-4 sm:grid-cols-2">
              {[
                "Pillar: Complete Guide to Family Dentistry",
                "Support: Costs & Insurance Explained",
                "Support: Kids’ First Visit Checklist",
                "Support: Teeth Whitening Options",
              ].map((t) => (
                <div key={t} className="rounded-lg border border-slate-200/70 bg-white p-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold">{t}</span>
                    <span className="rounded-md bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-700">
                      EEAT ✓
                    </span>
                  </div>
                  <p className="mt-2 line-clamp-2 text-sm text-slate-600">
                    Interlinked. Schema ready. Citations included.
                  </p>
                </div>
              ))}
            </div>
            <div className="flex items-center justify-between border-t border-slate-200/70 bg-bc-bg px-4 py-3">
              <span className="text-sm text-slate-600">WordPress · Draft</span>
              <Button size="sm">Publish all</Button>
            </div>
          </Card>
        </div>
      </Section>
    </section>
  );
}

function Logos() {
  return (
    <section aria-label="Trusted by" className="border-y border-slate-200/70 bg-white">
      <Section className="py-8">
        <div className="flex flex-wrap items-center justify-center gap-x-10 gap-y-5 opacity-70">
          {["Dental", "Med Spa", "Real Estate", "B2B SaaS", "Local Service"].map((t) => (
            <div key={t} className="text-sm font-semibold text-slate-500">
              {t} teams use BlogCluster Pro
            </div>
          ))}
        </div>
      </Section>
    </section>
  );
}

function FeatureGrid() {
  const features = [
    {
      title: "Real-time research",
      desc: "Perplexity-backed research with citations to authoritative sources.",
      points: ["Fresh stats", "Citations inline", "External links for EEAT"],
    },
    {
      title: "Cluster strategy",
      desc: "4 pillars + 12–18 supporting posts, interlinked for topical authority.",
      points: ["Avoids cannibalization", "Contextual anchors", "Auto internal links"],
    },
    {
      title: "Technical SEO baked in",
      desc: "Schema, meta, headings, image alts — injected at write time.",
      points: ["Featured snippet format", "Image optimization", "Clean HTML"],
    },
    {
      title: "Direct WordPress publishing",
      desc: "Push drafts to your site — or export JSON/Markdown.",
      points: ["Draft or publish", "Tags & categories", "Slugs, redirects"],
    },
  ];

  return (
    <Section>
      <div className="mx-auto max-w-2xl text-center">
        <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">Built for rankings, not busywork</h2>
        <p className="mt-3 text-bc-subink">
          Authority-grade writing with the boring SEO done for you. No keys, no tokens, no headaches.
        </p>
      </div>

      <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {features.map((f) => (
          <Card key={f.title} className="p-6 md:p-8">
            <h3 className="text-lg font-semibold">{f.title}</h3>
            <p className="mt-1 text-sm text-slate-600">{f.desc}</p>
            <ul className="mt-4 space-y-2 text-sm text-slate-700">
              {f.points.map((p) => (
                <li key={p} className="flex items-start gap-2">
                  <span className="mt-1 inline-block h-2 w-2 rounded-full bg-bc-primary" />
                  <span>{p}</span>
                </li>
              ))}
            </ul>
          </Card>
        ))}
      </div>
    </Section>
  );
}

/** Gradient promo strip that points to Pricing */
function PricingStrip() {
  return (
    <section className="bg-gradient-to-r from-bc-primary to-bc-navy text-white">
      <Section className="py-10">
        <div className="flex flex-col items-start justify-between gap-6 md:flex-row md:items-center">
          <div>
            <h3 className="text-2xl font-bold">Lock in launch pricing today</h3>
            <p className="mt-1 text-white/80">
              Research-backed clusters, technical SEO baked in, and one-click publishing.
            </p>
          </div>
          <div className="flex gap-3">
            <Link href="/pricing">
              <Button size="lg" variant="primary">View Pricing</Button>
            </Link>
            <Link href="/features">
              <Button size="lg" variant="outline" className="!border-white/30 !text-white hover:!bg-white/10">
                See How It Works
              </Button>
            </Link>
          </div>
        </div>
      </Section>
    </section>
  );
}

function HowItWorks() {
  const steps = [
    { n: "1", t: "Add a topic", d: "Tell us your niche & voice. We handle clustering and keywords." },
    { n: "2", t: "We research & write", d: "Perplexity + GPT craft pillar & supporting posts with EEAT." },
    { n: "3", t: "Approve & publish", d: "One-click WordPress publish. Exports for everything else." },
  ];
  return (
    <Section>
      <div className="mx-auto max-w-2xl text-center">
        <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">How it works</h2>
        <p className="mt-3 text-bc-subink">From topic to fully-linked cluster in minutes.</p>
      </div>
      <div className="mt-8 grid gap-6 md:grid-cols-3">
        {steps.map((s) => (
          <Card key={s.n} className="p-6 md:p-8">
            <div className="text-bc-primary text-xl font-bold">{s.n}</div>
            <h3 className="mt-2 font-semibold">{s.t}</h3>
            <p className="mt-2 text-slate-700">{s.d}</p>
          </Card>
        ))}
      </div>
    </Section>
  );
}

function WinsReport() {
  return (
    <Section>
      <Card className="p-6 md:p-8">
        <div className="grid items-center gap-6 md:grid-cols-2">
          <div>
            <h3 className="text-2xl font-bold">Weekly Wins Report</h3>
            <p className="mt-2 text-slate-700">
              Get keyword lifts, ranking changes, and traffic estimates in your inbox — even while SEO compounds.
            </p>
            <ul className="mt-4 space-y-2 text-sm text-slate-700">
              {[
                "Blogs published this week",
                "Keywords targeted & movements",
                "Top internal links created",
                "Early traffic & engagement signals",
              ].map((x) => (
                <li key={x} className="flex items-start gap-2">
                  <span className="mt-1 inline-block h-2 w-2 rounded-full bg-bc-primary" />
                  <span>{x}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-lg border border-slate-200/70 bg-bc-bg p-4">
            <div className="text-sm text-slate-700">This week at a glance</div>
            <div className="mt-3 grid grid-cols-3 gap-3 text-center">
              {[
                ["+18", "Posts published"],
                ["+42", "Keyword gains"],
                ["+12%", "CTR lift"],
              ].map(([v, k]) => (
                <div key={k} className="rounded-lg bg-white p-4 shadow-sm">
                  <div className="text-2xl font-extrabold">{v}</div>
                  <div className="text-xs text-slate-600">{k}</div>
                </div>
              ))}
            </div>
            <Link
              href="/sample-report"
              className="mt-4 inline-block text-sm font-semibold text-bc-primary hover:text-bc-primaryHover"
            >
              View sample report →
            </Link>
          </div>
        </div>
      </Card>
    </Section>
  );
}

function Testimonials() {
  const items = [
    {
      q: "We replaced a $5k/mo agency. Clusters shipped in days — rankings moved within weeks.",
      a: "Owner, Austin Dental Group",
    },
    {
      q: "No keys, no setup. I just approved drafts in WordPress and hit publish.",
      a: "Marketing Lead, Med Spa TX",
    },
  ];
  return (
    <Section>
      <div className="mx-auto max-w-2xl text-center">
        <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">What customers say</h2>
      </div>
      <div className="mt-8 grid gap-6 md:grid-cols-2">
        {items.map((t) => (
          <Card key={t.q} className="p-6 md:p-8 bg-bc-primary/5 border-0">
            <blockquote className="text-lg text-bc-ink">“{t.q}”</blockquote>
            <figcaption className="mt-3 text-sm text-slate-600">— {t.a}</figcaption>
          </Card>
        ))}
      </div>
    </Section>
  );
}

function FAQ() {
  const qa = [
    {
      q: "How long until I see SEO results?",
      a: "Early movement often appears in 4–12 weeks. We ship fast so compounding starts sooner; Weekly Wins Reports keep you informed.",
    },
    {
      q: "Do you support non-WordPress sites?",
      a: "Yes. Export clean HTML/Markdown/JSON for Webflow, Wix, Squarespace, or custom CMS. Webflow connector is on our roadmap.",
    },
    {
      q: "Is AI-generated content penalized?",
      a: "Search engines reward helpful content. We focus on EEAT: citations, structure, accuracy, and real value to readers.",
    },
    {
      q: "Can I edit before publishing?",
      a: "Yes — approve or edit drafts before they’re published. You can also enable auto-publish once you trust the flow.",
    },
    {
      q: "Who owns the content?",
      a: "You do — 100%. We provide the research, writing, and automation; the rights are yours.",
    },
  ];
  return (
    <Section>
      <div className="mx-auto max-w-2xl text-center">
        <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">FAQs</h2>
      </div>
      <div className="mx-auto mt-8 max-w-3xl divide-y divide-slate-200 rounded-xl2 border border-slate-200/70 bg-white">
        {qa.map((x, i) => (
          <details key={x.q} className="group px-5 py-4 rounded-lg hover:bg-slate-50">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4">
              <h3 className="text-base font-semibold">{x.q}</h3>
              <span className="text-bc-primary transition group-open:rotate-45">＋</span>
            </summary>
            <p className="mt-2 text-slate-700">{x.a}</p>
            {i < qa.length - 1 && <div className="mt-4 h-px bg-slate-200/70" />}
          </details>
        ))}
      </div>
    </Section>
  );
}

function FinalCTA() {
  return (
    <section className="bg-bc-navy text-white">
      <Section className="text-center">
        <div className="mx-auto max-w-4xl rounded-2xl bg-white/5 p-8 backdrop-blur-sm ring-1 ring-white/10">
          <h2 className="text-3xl font-bold">Start your first cluster today</h2>
          <p className="mt-3 text-white/80">
            Authority-grade content for a fraction of agency cost. No keys, no tokens, no headaches.
          </p>
          <div className="mt-6 flex justify-center gap-3">
            <Link href="/pricing">
              <Button size="lg" variant="primary">View Pricing</Button>
            </Link>
            <Link href="/features">
              <Button variant="outline" size="lg" className="!border-white/30 !text-white hover:!bg-white/10">
                See How It Works
              </Button>
            </Link>
          </div>
          <p className="mt-3 text-xs text-white/60">14-day guarantee · Cancel anytime</p>
        </div>
      </Section>
    </section>
  );
}