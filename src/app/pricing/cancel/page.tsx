// src/app/pricing/cancel/page.tsx
export default function CancelPage() {
  return (
    <main className="max-w-2xl mx-auto px-6 py-16 text-center">
      <h1 className="text-3xl font-bold">Checkout canceled</h1>
      <p className="mt-3 text-bc-subink">No worries—your card wasn’t charged.</p>
      <a href="/pricing" className="mt-6 inline-flex rounded-xl px-4 py-2 border">
        Back to pricing
      </a>
    </main>
  );
}