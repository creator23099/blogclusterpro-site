// src/app/about/page.tsx
import Link from "@/components/Link";

export const metadata = {
  title: "About · BlogCluster Pro",
  description:
    "Why we built BlogCluster Pro: research-backed content clusters for SMBs with citations, technical SEO, and one-click publishing.",
};

export default function AboutPage() {
  return (
    <div>
      <Hero />
      <Origin />
      <Principles />
      <HowWeWork />
      <WhoWeServe />
      <Roadmap />
      <Trust />
      <FinalCTA />
    </div>
  );
}

/* =========================
   Sections (inline components)
   ========================= */

function Hero() {
  return (
    <section className="mx-auto w-full max-w-7xl px-5 pt-16 md:px-8 md:pt-20">
      <div className="max-w-3xl">
        <p className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-bc-subink">
          Our story · Why we exist
        </p>
        <h1 className="mt-4 text-4xl font-extrabold leading-tight tracking-tight text-bc-ink sm:text-5xl">
          We were tired of seeing SMBs overpay for low-quality blogs.
        </h1>
        <p className="mt-4 text-lg text-bc-subink">
          Agencies quoted $300–$800 per post and still shipped generic content with weak research,
          no internal links, and poor formatting. We built BlogCluster Pro to change that —
          <strong> research-backed, interlinked, schema-ready content clusters</strong> that publish
          directly to your site. No API keys. No tokens. No hassle.
        </p>
      </div>
    </section>
  );
}

function Origin() {
  return (
    <section className="mx-auto w-full max-w-7xl px-5 py-12 md:px-8">
      <div className="grid gap-8 rounded-xl2 border border-slate-200/70 bg-white p-6 shadow-card md:grid-cols-2">
        <div>
          <h2 className="text-2xl font-bold">Our origin</h2>
          <p className="mt-3 text-slate-700">
            We’ve worked with founders, dentists, local service pros, and lean marketing teams. Time
            after time, we saw the same pattern: <em>inconsistent posting, shallow research,
            thin on-page SEO</em>, and pricing that didn’t match outcomes.
          </p>
          <p className="mt-3 text-slate-700">
            So we productized what actually moves rankings: <strong>content clusters</strong> with
            real citations (EEAT), smart internal linking, and technical SEO baked in — delivered
            at a price SMBs can actually justify.
          </p>
        </div>
        <ul className="grid content-start gap-3 rounded-xl bg-bc-bg p-4 text-sm">
          {[
            "Perplexity-powered research with citations to reputable sources",
            "Cluster architecture to build topical authority (pillars + supporting posts)",
            "Automatic schema, meta, headings, image alt text",
            "Direct WordPress publishing (drafts or live)",
            "Weekly Wins Report to prove momentum while SEO compounds",
          ].map((x) => (
            <li key={x} className="flex items-start gap-2">
              <span className="mt-1 inline-block h-2 w-2 rounded-full bg-bc-primary" />
              <span>{x}</span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

function Principles() {
  const items = [
    {
      title: "People-first content",
      desc: "Readable, useful, and credible. We write for humans, then optimize for search.",
    },
    {
      title: "EEAT, not guesswork",
      desc: "Every cluster is researched with current sources and clear attribution.",
    },
    {
      title: "Structure wins",
      desc: "Clusters, internal links, and clean HTML beat ad-hoc posts every time.",
    },
    {
      title: "Simplicity for SMBs",
      desc: "No keys or tokens. We handle the tech so you can approve and publish.",
    },
    {
      title: "Proof over promises",
      desc: "Weekly Wins Reports show progress: posts, keywords, early signals.",
    },
    {
      title: "Transparency",
      desc: "You own the content. Export Markdown/HTML/JSON anytime.",
    },
  ];

  return (
    <section className="mx-auto w-full max-w-7xl px-5 py-12 md:px-8">
      <h2 className="text-2xl font-bold">What we believe</h2>
      <p className="mt-2 text-bc-subink">
        These principles keep our quality bar high and our outcomes consistent.
      </p>
      <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((i) => (
          <div
            key={i.title}
            className="rounded-xl2 border border-slate-200/70 bg-white p-5 shadow-card"
          >
            <h3 className="text-lg font-semibold">{i.title}</h3>
            <p className="mt-2 text-slate-700">{i.desc}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function HowWeWork() {
  const steps = [
    {
      title: "1) Brand voice & goals",
      desc: "Tell us your niche, services, tone, and priority keywords. We build a profile that guides every post.",
    },
    {
      title: "2) Research & clustering",
      desc: "We use Perplexity + GPT to collect current facts and map a pillar + supporting structure that avoids cannibalization.",
    },
    {
      title: "3) Drafts with EEAT & SEO",
      desc: "Citations inline, schema injected, headings/alt text set, interlinks generated. Real substance, not fluff.",
    },
    {
      title: "4) Approve & publish",
      desc: "Review in our portal or right inside WordPress. Publish all at once or schedule over time.",
    },
    {
      title: "5) Weekly Wins Report",
      desc: "See posts shipped, targeted keywords, early visibility signals, and next recommended topics.",
    },
  ];

  return (
    <section className="mx-auto w-full max-w-7xl px-5 py-12 md:px-8">
      <div className="rounded-xl2 border border-slate-200/70 bg-white p-6 shadow-card">
        <h2 className="text-2xl font-bold">How we work</h2>
        <div className="mt-6 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {steps.map((s) => (
            <div key={s.title} className="rounded-xl border border-slate-200/70 bg-bc-bg p-5">
              <h3 className="font-semibold">{s.title}</h3>
              <p className="mt-2 text-slate-700">{s.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function WhoWeServe() {
  const icp = [
    "Dentists",
    "Med Spas",
    "Real Estate",
    "B2B Services & SaaS",
    "Local Trades",
    "Clinics & Wellness",
  ];

  return (
    <section className="mx-auto w-full max-w-7xl px-5 py-12 md:px-8">
      <div className="grid items-center gap-8 md:grid-cols-2">
        <div>
          <h2 className="text-2xl font-bold">Who we serve</h2>
          <p className="mt-2 text-slate-700">
            We specialize in SMBs that need dependable compounding growth without enterprise
            complexity.
          </p>
          <ul className="mt-4 grid grid-cols-2 gap-2 text-sm">
            {icp.map((x) => (
              <li
                key={x}
                className="rounded-lg border border-slate-200/70 bg-white px-3 py-2 shadow-sm"
              >
                {x}
              </li>
            ))}
          </ul>
        </div>
        <div className="rounded-xl2 border border-slate-200/70 bg-white p-6 shadow-card">
          <h3 className="text-lg font-semibold">Why clusters, not one-offs?</h3>
          <p className="mt-2 text-slate-700">
            Search engines reward depth and structure. Clusters build topical authority, distribute
            link equity internally, and help you rank for both head and long-tail terms.
          </p>
          <ul className="mt-4 space-y-2 text-sm text-slate-700">
            {[
              "Pillars rank for competitive, high-intent terms",
              "Supporting posts capture long-tail queries & FAQs",
              "Contextual internal links reinforce relevance",
            ].map((x) => (
              <li key={x} className="flex items-start gap-2">
                <span className="mt-1 inline-block h-2 w-2 rounded-full bg-bc-primary" />
                <span>{x}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}

function Roadmap() {
  const items = [
    { tag: "Now", text: "Direct WordPress publishing, HTML/Markdown/JSON exports" },
    { tag: "Q4", text: "Webflow & Wix export presets, image CDN integration" },
    { tag: "Q1", text: "GSC integration for verified keyword & impression reporting" },
    { tag: "Q2", text: "Managed add-ons: human review, custom imagery, brand voice training" },
  ];

  return (
    <section className="mx-auto w-full max-w-7xl px-5 py-12 md:px-8">
      <div className="rounded-xl2 border border-slate-200/70 bg-white p-6 shadow-card">
        <h2 className="text-2xl font-bold">What’s next</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {items.map((x) => (
            <div key={x.text} className="rounded-lg border border-slate-200/70 bg-bc-bg p-4">
              <span className="text-xs font-semibold uppercase text-bc-primary">{x.tag}</span>
              <p className="mt-2 text-sm text-slate-700">{x.text}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Trust() {
  return (
    <section className="mx-auto w-full max-w-7xl px-5 py-12 md:px-8">
      <div className="grid gap-8 md:grid-cols-2">
        <div className="rounded-xl2 border border-slate-200/70 bg-white p-6 shadow-card">
          <h3 className="text-lg font-semibold">Research & Citations Policy</h3>
          <p className="mt-2 text-slate-700">
            Every cluster uses current sources with clear attribution. We prioritize official data,
            peer-reviewed or reputable industry publications, and keep citations visible in the draft
            for review. Helpful content first, optimization second.
          </p>
          <Link
            className="mt-3 inline-block text-sm font-semibold text-bc-primary hover:text-bc-primaryHover"
            href="/research-policy"
          >
            Read the policy →
          </Link>
        </div>
        <div className="rounded-xl2 border border-slate-200/70 bg-white p-6 shadow-card">
          <h3 className="text-lg font-semibold">Ownership & Portability</h3>
          <p className="mt-2 text-slate-700">
            You own everything. Export Markdown, HTML, or JSON anytime. Switch CMS? Take your content
            and interlink map with you — no lock-in.
          </p>
          <div className="mt-3 text-sm text-slate-700">
            <div>• Privacy-first handling of your data</div>
            <div>• Transparent pricing & no surprise overages</div>
            <div>• 14-day guarantee</div>
          </div>
        </div>
      </div>
    </section>
  );
}

function FinalCTA() {
  return (
    <section className="px-5 pb-16 pt-8 md:px-8">
      <div className="mx-auto max-w-4xl rounded-2xl bg-white p-8 text-center shadow-card">
        <h2 className="text-3xl font-bold">Let’s fix content the right way</h2>
        <p className="mt-3 text-bc-subink">
          Research-backed clusters, technical SEO done for you, and publishing that’s actually easy.
        </p>
        <div className="mt-6 flex justify-center gap-3">
          <Link
            href="/pricing"
            className="inline-flex items-center rounded-xl bg-bc-primary px-6 py-3 font-semibold text-white shadow hover:bg-bc-primaryHover focus-visible:outline-none focus-visible:ring-4 ring-bc-ring"
          >
            View Pricing
          </Link>
          <Link
            href="/get-started"
            className="inline-flex items-center rounded-xl border border-slate-300/70 px-6 py-3 font-semibold text-bc-ink hover:bg-white"
          >
            Get Started
          </Link>
        </div>
        <p className="mt-3 text-xs text-slate-500">No keys, no tokens, no headaches.</p>
      </div>
    </section>
  );
}