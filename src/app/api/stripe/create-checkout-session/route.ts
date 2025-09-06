// src/app/api/stripe/create-checkout-session/route.ts
import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { stripe, APP_URL, PRICE_TO_PLAN } from "@/lib/stripe";

export const runtime = "nodejs"; // Stripe SDK needs Node, not Edge

function resolveOrigin(req: Request) {
  return process.env.NEXT_PUBLIC_SITE_URL || APP_URL || new URL(req.url).origin;
}

export async function POST(req: Request) {
  try {
    // ✅ Must await
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { priceId } = (await req.json().catch(() => ({}))) as {
      priceId?: string;
    };
    if (!priceId) {
      return NextResponse.json({ error: "Missing priceId" }, { status: 400 });
    }

    const plan = PRICE_TO_PLAN[priceId];
    if (!plan) {
      return NextResponse.json(
        { error: `Unknown priceId: ${priceId}. Check STRIPE_PRICE_* envs.` },
        { status: 400 }
      );
    }

    const origin = resolveOrigin(req);
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${origin}/pricing/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/pricing/cancel`,
      client_reference_id: userId,
      metadata: { clerkId: userId },
    });

    return NextResponse.json({ url: session.url });
  } catch (err: any) {
    console.error("Checkout route error:", err);
    return NextResponse.json(
      { error: err?.message ?? "Internal Server Error" },
      { status: 500 }
    );
  }
}