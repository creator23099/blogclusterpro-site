// src/app/pricing/success/page.tsx
export default function SuccessPage() {
  return (
    <main className="max-w-2xl mx-auto px-6 py-16 text-center">
      <h1 className="text-3xl font-bold">You're in 🎉</h1>
      <p className="mt-3 text-bc-subink">
        Your subscription is active. It can take a few seconds to sync. Try refreshing your dashboard.
      </p>
      <a href="/dashboard" className="mt-6 inline-flex rounded-xl px-4 py-2 bg-bc-primary text-white">
        Go to Dashboard
      </a>
    </main>
  );
}