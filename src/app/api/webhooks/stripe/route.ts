// src/app/api/webhooks/stripe/route.ts
import { NextResponse } from "next/server";
import type Stripe from "stripe";

// ⬇️ relative paths from /src/app/api/webhooks/stripe/route.ts back to /src/lib/*
import { stripe, PRICE_TO_PLAN } from "../../../../lib/stripe";
import { db } from "../../../../lib/db";

// IMPORTANT: use the Node.js runtime so we can read the raw body for signature verification.
export const runtime = "nodejs";

// Small helper to map Stripe price -> internal plan
function resolvePlanFromPrice(
  priceId: string | undefined
): "starter" | "pro" | "agency" | "byok" {
  if (!priceId) return "starter";
  return PRICE_TO_PLAN[priceId] ?? "starter";
}

export async function POST(req: Request) {
  const sig = req.headers.get("stripe-signature");
  const whSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!sig || !whSecret) {
    return new NextResponse("Missing webhook secret/signature", { status: 400 });
  }

  // We need the raw body string for Stripe verification
  const rawBody = await req.text();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, sig, whSecret);
  } catch (err: any) {
    console.error("Webhook signature verification failed:", err?.message);
    return new NextResponse(`Webhook Error: ${err?.message ?? "unknown"}`, { status: 400 });
  }

  try {
    switch (event.type) {
      /**
       * A new Checkout Session finished successfully.
       * We fetch the Subscription to get price & period_end,
       * then upsert our Subscription row.
       */
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;

        const clerkId =
          (session.client_reference_id as string | undefined) ??
          (session.metadata?.clerkId as string | undefined);

        if (!clerkId) break;

        // Find our app user (we store Clerk id on users table)
        const user = await db.user.findUnique({ where: { clerkId } });
        if (!user) break;

        // Retrieve the subscription to read items/periods
        let sub: Stripe.Subscription | null = null;
        if (session.subscription && typeof session.subscription === "string") {
          sub = await stripe.subscriptions.retrieve(session.subscription);
        }
        if (!sub) break;

        const priceId = sub.items.data[0]?.price?.id;
        const plan = resolvePlanFromPrice(priceId);

        await db.subscription.upsert({
          where: { userId: user.id },
          update: {
            stripeCustomerId: session.customer as string,
            stripeSubId: sub.id,
            stripePriceId: priceId ?? "",
            status: sub.status,
            currentPeriodEnd: new Date(sub.current_period_end * 1000),
            plan,
          },
          create: {
            userId: user.id,
            stripeCustomerId: session.customer as string,
            stripeSubId: sub.id,
            stripePriceId: priceId ?? "",
            status: sub.status,
            currentPeriodEnd: new Date(sub.current_period_end * 1000),
            plan,
          },
        });

        break;
      }

      /**
       * Subscription was updated (plan change, renewed, paused, etc.)
       */
      case "customer.subscription.updated": {
        const sub = event.data.object as Stripe.Subscription;
        const priceId = sub.items.data[0]?.price?.id;
        const plan = resolvePlanFromPrice(priceId);

        // Find our row by customer id (we stored it earlier)
        const existing = await db.subscription.findFirst({
          where: { stripeCustomerId: sub.customer as string },
        });
        if (!existing) break;

        await db.subscription.update({
          where: { userId: existing.userId },
          data: {
            stripeSubId: sub.id,
            stripePriceId: priceId ?? "",
            status: sub.status,
            currentPeriodEnd: new Date(sub.current_period_end * 1000),
            plan,
          },
        });

        break;
      }

      /**
       * Subscription was canceled/deleted
       */
      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription;

        const existing = await db.subscription.findFirst({
          where: { stripeCustomerId: sub.customer as string },
        });
        if (!existing) break;

        await db.subscription.update({
          where: { userId: existing.userId },
          data: {
            stripeSubId: sub.id,
            status: sub.status, // usually "canceled"
            currentPeriodEnd: new Date(sub.current_period_end * 1000),
          },
        });

        break;
      }

      default: {
        // Not handling this event type; that's fine.
      }
    }

    return NextResponse.json({ received: true });
  } catch (err: any) {
    console.error("Webhook handler error:", err);
    // Respond 200 so Stripe doesn't retry forever if it's a one-off bug in our code.
    // If you want retries, return 500 instead.
    return new NextResponse("Webhook handler error", { status: 200 });
  }
}