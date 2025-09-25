// src/lib/stripe.ts
import Stripe from "stripe";

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error("Missing STRIPE_SECRET_KEY in env");
}

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2024-06-20",
});

export const APP_URL =
  process.env.APP_URL ?? "http://localhost:3000";

// Map Stripe price IDs → internal plan keys
export const PRICE_TO_PLAN: Record<string, "starter" | "pro" | "agency" | "byok"> = {
  [process.env.STRIPE_PRICE_STARTER!]: "starter",
  [process.env.STRIPE_PRICE_PRO!]: "pro",
  [process.env.STRIPE_PRICE_AGENCY!]: "agency",
  ...(process.env.STRIPE_PRICE_BYOK
    ? { [process.env.STRIPE_PRICE_BYOK]: "byok" }
    : {}),
};