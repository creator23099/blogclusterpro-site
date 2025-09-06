// src/app/faq/page.tsx
import type { Metadata } from "next";
import Link from "@/components/Link";
import Section from "@/components/Section";
import { Card } from "@/components/Card";
import Button from "@/components/Button";
import AccordionGroup from "@/components/AccordionGroup";

export const metadata: Metadata = {
  title: "FAQ – BlogCluster Pro",
  description:
    "Answers for small and mid-sized businesses: what content clusters are, how SEO/GSO work, publishing flow, pricing, ownership, and results with BlogCluster Pro.",
  openGraph: {
    title: "FAQ – BlogCluster Pro",
    description:
      "Understand content clusters, EEAT, SEO vs GSO, publishing to WordPress, pricing, ownership and expected results.",
    images: [{ url: "/og-image.png", width: 1200, height: 630, alt: "BlogCluster Pro FAQ" }],
    type: "website",
  },
};

const FAQ_GROUPS: { heading: string; items: { q: string; a: string }[] }[] = [
  {
    heading: "Basics",
    items: [
      {
        q: "What is BlogCluster Pro?",
        a: "BlogCluster Pro helps small and mid-sized businesses publish high-quality blog content that actually ranks. Instead of random one-off posts, we build “content clusters”: one comprehensive pillar article plus several supporting posts, all interlinked. That structure shows Google you’re an authority on a topic, so you rank for dozens of related keywords—not just one."
      },
      {
        q: "What do SEO and GSO mean?",
        a: "SEO is Search Engine Optimization—helping your content show up in Google. GSO (Google Search Optimization) is our emphasis on aligning with how Google evaluates content today: expertise, real-world experience, authoritative citations, and user intent. BlogCluster Pro bakes these in so you don’t need to be an SEO expert."
      },
      {
        q: "Why are content clusters better than one-off blog posts?",
        a: "One-offs scatter your effort. Clusters concentrate it. A pillar (e.g., “Complete Guide to Family Dentistry”) links to supporting posts (costs, first visits, whitening, etc.). Those posts link back to the pillar. This hub-and-spoke model helps Google understand depth and relevance, which boosts visibility, rankings, and lead flow over time."
      }
    ]
  },
  {
    heading: "Publishing & workflow",
    items: [
      {
        q: "How do I publish with BlogCluster Pro?",
        a: "If you use WordPress, connect once and push clusters directly as drafts. Review, edit, and publish with one click. On other platforms (Webflow, Squarespace, Wix, custom CMS), export clean HTML/Markdown and paste it in. No complex setup or API keys required."
      },
      {
        q: "Can I edit drafts before they go live?",
        a: "Yes. You stay in control. Most teams review early drafts to add brand voice or local specifics. When you’re comfortable, you can publish immediately or enable auto-publish. Either way, the research, structure, and linking are handled for you."
      },
      {
        q: "How are internal links handled?",
        a: "We generate contextual internal links across each cluster: pillar ↔ supporting posts. This distributes relevance and authority through your site and is a key reason clusters outperform ad-hoc blogging."
      }
    ]
  },
  {
    heading: "Research, quality & compliance",
    items: [
      {
        q: "Where does the research come from?",
        a: "We prioritize reputable sources—industry associations, government sites, and trusted publications—and cite them inline. This maps to Google’s EEAT (Expertise, Experience, Authoritativeness, Trustworthiness) guidelines and gives readers confidence in the information."
      },
      {
        q: "Is this just AI content?",
        a: "No. Copy-pasted AI content rarely ranks. BlogCluster Pro combines research, citations, schema, headings, alt text, and internal linking with high-quality drafting. That blend is what drives rankings. Agencies charge thousands per month to produce the same structure—our software does it in minutes."
      },
      {
        q: "Will AI hurt my rankings?",
        a: "Google doesn’t punish AI; it deprioritizes thin or unhelpful content. Accurate, cited, well-structured articles that satisfy search intent can rank—regardless of the drafting tool. That’s the guardrail our workflow enforces."
      }
    ]
  },
  {
    heading: "Pricing, ownership & terms",
    items: [
      {
        q: "How much does it cost?",
        a: "Plans scale with how many clusters you need monthly. A local practice might start with 1–2 clusters; a SaaS team might run 4–5. Everything is month-to-month—check the Pricing page for the best fit."
      },
      {
        q: "Who owns the content?",
        a: "You do—100%. Drafts, published posts, and research remain yours forever. If you cancel, you keep everything you’ve produced."
      },
      {
        q: "Do I need a contract or pay setup fees?",
        a: "No contracts or setup fees. Start, pause, or cancel anytime."
      }
    ]
  },
  {
    heading: "Support & results",
    items: [
      {
        q: "When will I see results?",
        a: "Typical timelines: early keyword lifts in 4–8 weeks, meaningful traffic growth in 3–6 months. SEO compounds—starting now means momentum accrues sooner. Our Weekly Wins Report shows posts shipped, keywords gained, and leading indicators so you can track progress."
      },
      {
        q: "What support is included?",
        a: "All plans include onboarding and email support. Need extra help—brand-voice customization, content reviews, or scaling strategy? We offer managed add-ons."
      },
      {
        q: "How does this compare to hiring an agency?",
        a: "Agencies often charge $3k–$10k/month for clusters, reports, and publishing. BlogCluster Pro automates the heavy lifting—research, drafting, linking, schema, and WordPress publishing—at a fraction of the cost, with faster turnaround."
      }
    ]
  }
];

export default function FAQPage() {
  return (
    <>
      {/* Hero */}
      <Section className="section-y">
        <div className="mx-auto max-w-3xl text-center">
          <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-bc-primary/10 px-3 py-1 text-sm font-medium text-bc-primary">
            <span className="h-2 w-2 rounded-full bg-bc-primary" />
            Frequently Asked Questions
          </div>
          <h1 className="text-4xl font-bold tracking-tight text-bc-ink md:text-5xl">
            Everything you need to know
          </h1>
          <p className="mt-3 text-bc-subink md:text-lg">
            Plain-English answers about clusters, SEO/GSO, publishing, pricing, ownership, and results.
          </p>

          <div className="mt-6 flex items-center justify-center gap-3">
            <Link href="/pricing">
              <Button size="lg">See Pricing</Button>
            </Link>
            <Link href="/features">
              <Button variant="outline" size="lg">Explore Features</Button>
            </Link>
          </div>
        </div>
      </Section>

      {/* FAQ groups (accordion per group) */}
      <Section className="section-y">
        <div className="mx-auto grid max-w-5xl gap-6">
          {FAQ_GROUPS.map((group) => (
            <AccordionGroup key={group.heading} heading={group.heading} items={group.items} />
          ))}
        </div>

        {/* Still have questions */}
        <div className="mx-auto mt-10 max-w-3xl rounded-xl2 bg-gradient-to-r from-bc-primary to-bc-navy p-6 text-center text-white shadow-card">
          <h3 className="text-2xl font-bold">Still have questions?</h3>
          <p className="mt-2 text-white/90">
            We’ll help you pick the right plan and show a sample cluster for your niche.
          </p>
          <div className="mt-4 flex justify-center gap-3">
            <Link href="/contact">
              <Button variant="secondary">Contact Us</Button>
            </Link>
            <Link href="/get-started">
              <Button>Get Started</Button>
            </Link>
          </div>
        </div>
      </Section>
    </>
  );
}