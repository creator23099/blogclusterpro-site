"use client";

import { useState } from "react";

export default function ManageBillingButton({ customerId }: { customerId: string }) {
  const [loading, setLoading] = useState(false);

  async function handleClick() {
    setLoading(true);
    try {
      const res = await fetch("/api/stripe/create-portal-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ customerId }),
      });

      if (!res.ok) throw new Error("Failed to create portal session");
      const { url } = await res.json();

      window.location.href = url; // redirect user to Stripe billing portal
    } catch (err) {
      console.error("Billing portal error:", err);
      alert("Could not open billing portal. Try again later.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      onClick={handleClick}
      disabled={loading}
      className="rounded-md bg-bc-primary px-4 py-2 text-sm font-semibold text-white hover:bg-bc-primaryHover disabled:opacity-50"
    >
      {loading ? "Loading..." : "Manage Billing"}
    </button>
  );
}