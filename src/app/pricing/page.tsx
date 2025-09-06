// src/app/pricing/page.tsx
import Section from "@/components/Section";
import { Card, CardHeader, CardBody, CardFooter } from "@/components/Card";
import Button from "@/components/Button";
import Link from "@/components/Link";
import CheckoutButton from "@/components/CheckoutButton";

// Read Stripe Price IDs safely
const STARTER = process.env.STRIPE_PRICE_STARTER || "";
const PRO = process.env.STRIPE_PRICE_PRO || "";
const AGENCY = process.env.STRIPE_PRICE_AGENCY || "";
const BYOK = process.env.STRIPE_PRICE_BYOK || "";

export default function PricingPage() {
  return (
    <>
      {/* Hero */}
      <Section id="pricing-hero" className="text-center">
        <p className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-bc-subink">
          Launch Pricing · Early adopters are grandfathered for life
        </p>
        <h1 className="mt-4 text-4xl font-extrabold leading-tight tracking-tight sm:text-5xl">
          Authority-grade content without agency prices.
        </h1>
        <p className="mt-4 text-lg text-bc-subink">
          Research-backed clusters, technical SEO baked in, and one-click WordPress publishing.
          <strong> No keys, no tokens, no headaches.</strong>
        </p>
      </Section>

      {/* Plans */}
      <Section id="plans">
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {/* Starter */}
          <Card>
            <CardHeader title="Starter" subtitle="$99/mo" />
            <CardBody>
              <ul className="list-disc pl-5 text-sm text-slate-700 space-y-1.5">
                <li>1 pillar + 6 supporting posts / mo</li>
                <li>Perplexity research + EEAT citations</li>
                <li>Schema, meta, headings, image alts</li>
                <li>Interlinking map (HTML/MD/JSON export)</li>
                <li>WordPress: draft publishing</li>
                <li>Weekly Wins Report (lite)</li>
                <li>Email support</li>
              </ul>
            </CardBody>
            <CardFooter>
              <CheckoutButton priceId={STARTER} label="Choose Starter" />
            </CardFooter>
          </Card>

          {/* Growth */}
          <Card className="ring-2 ring-bc-primary/10">
            <div className="mb-2 inline-flex items-center rounded-full bg-bc-primary/10 px-3 py-1 text-xs font-semibold text-bc-primary">
              Most Popular
            </div>
            <CardHeader title="Growth" subtitle="$149/mo" />
            <CardBody>
              <ul className="list-disc pl-5 text-sm text-slate-700 space-y-1.5">
                <li>2 pillars + 10 supporting posts / mo</li>
                <li>Perplexity research + EEAT citations</li>
                <li>Auto schema + featured image handling</li>
                <li>Smart internal linking (contextual anchors)</li>
                <li>WordPress: draft & publish + tags/categories</li>
                <li>Weekly Wins Report</li>
                <li>Priority support</li>
              </ul>
            </CardBody>
            <CardFooter>
              <CheckoutButton priceId={PRO} label="Choose Growth" />
            </CardFooter>
          </Card>

          {/* Authority */}
          <Card>
            <CardHeader title="Authority" subtitle="$189/mo" />
            <CardBody>
              <ul className="list-disc pl-5 text-sm text-slate-700 space-y-1.5">
                <li>4 pillars + 18 supporting posts / mo</li>
                <li>Perplexity research + EEAT citations</li>
                <li>Technical SEO: schema/meta/alt/snippets</li>
                <li>Interlinking optimizer + cannibalization guard</li>
                <li>WordPress: publish & schedule, slugs, redirects</li>
                <li>Weekly Wins Report + recommendations</li>
                <li>Priority support + onboarding call</li>
              </ul>
            </CardBody>
            <CardFooter>
              <CheckoutButton priceId={AGENCY} label="Choose Authority" />
            </CardFooter>
          </Card>

          {/* Enterprise */}
          <Card>
            <CardHeader title="Enterprise" subtitle="Custom" />
            <CardBody>
              <ul className="list-disc pl-5 text-sm text-slate-700 space-y-1.5">
                <li>Custom pillars/supporting volumes</li>
                <li>Brand Voice training & human-in-loop options</li>
                <li>Multi-brand & multi-site controls</li>
                <li>Webflow/Wix export presets (roadmap)</li>
                <li>GSC integration for verified reporting (roadmap)</li>
                <li>SAML/SSO, DPA, SLAs · Dedicated CSM</li>
              </ul>
            </CardBody>
            <CardFooter>
              <Link href="/contact" className="block w-full">
                <Button className="w-full">Talk to Sales</Button>
              </Link>
            </CardFooter>
          </Card>
        </div>

        <p className="mt-6 text-center text-xs text-slate-500">
          Launch pricing shown. Early customers are grandfathered for life.
        </p>
      </Section>

      {/* Advanced: BYOK */}
      {BYOK && (
        <Section id="byok">
          <details className="group mx-auto max-w-4xl rounded-xl2 border border-slate-200/70 bg-white p-6 shadow-card">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4">
              <div>
                <h3 className="text-lg font-semibold">Advanced: Bring-Your-Own-Key (BYOK)</h3>
                <p className="text-sm text-slate-600">
                  Power users can connect their own OpenAI/Perplexity keys for usage-based savings.
                </p>
              </div>
              <span className="text-bc-primary transition group-open:rotate-45">＋</span>
            </summary>

            <div className="mt-4 grid gap-6 md:grid-cols-2">
              <div className="rounded-lg border border-slate-200/70 bg-bc-bg p-4">
                <h4 className="font-semibold">Pros</h4>
                <ul className="mt-2 space-y-2 text-sm text-slate-700">
                  <li>• Potentially lower variable costs at high volume</li>
                  <li>• Full control over model choice/limits</li>
                  <li>• Good for agencies with existing API spend</li>
                </ul>
              </div>
              <div className="rounded-lg border border-slate-200/70 bg-bc-bg p-4">
                <h4 className="font-semibold">Trade-offs</h4>
                <ul className="mt-2 space-y-2 text-sm text-slate-700">
                  <li>• You manage API billing & rate limits</li>
                  <li>• Setup friction (keys, quotas, model updates)</li>
                  <li>• Our managed “no-keys” experience is simpler</li>
                </ul>
              </div>
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-3">
              <Link
                href="/docs/byok"
                className="rounded-md border border-slate-300/70 px-4 py-2 text-sm font-semibold text-bc-ink hover:bg-white"
              >
                Read BYOK Guide
              </Link>
              <CheckoutButton priceId={BYOK} label="Enable BYOK ($50/mo)" />
            </div>

            <p className="mt-3 text-xs text-slate-500">
              Most SMBs prefer our fully managed flow (no keys/tokens). BYOK is optional and best
              for agencies or technical teams.
            </p>
          </details>
        </Section>
      )}

      {/* Final CTA */}
      <Section id="pricing-cta" className="text-center">
        <div className="mx-auto max-w-4xl rounded-2xl bg-white p-8 text-center shadow-card">
          <h2 className="text-3xl font-bold">Lock in launch pricing today</h2>
          <p className="mt-3 text-bc-subink">
            Research-backed clusters, technical SEO done for you, and publishing that’s actually easy.
          </p>
          <div className="mt-6 flex justify-center gap-3">
            <Button>Get Started</Button>
            <Button variant="outline">Talk to Sales</Button>
          </div>
          <p className="mt-3 text-xs text-slate-500">14-day guarantee · Cancel anytime</p>
        </div>
      </Section>
    </>
  );
}