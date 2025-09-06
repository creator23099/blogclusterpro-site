'use client';

type Props = { priceId: string; label?: string; className?: string };

export default function CheckoutButton({
  priceId,
  label = 'Choose plan',
  className = '',
}: Props) {
  const onClick = async () => {
    try {
      const res = await fetch('/api/stripe/create-checkout-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ priceId }),
      });

      if (!res.ok) {
        const t = await res.text();
        throw new Error(t || `HTTP ${res.status}`);
      }

      const { url } = (await res.json()) as { url?: string; error?: string };
      if (!url) throw new Error('No Checkout URL returned');
      window.location.href = url;
    } catch (err) {
      console.error('CheckoutButton error:', err);
      alert('Could not start checkout. Check console/logs.');
    }
  };

  return (
    <button
      type="button"
      onClick={onClick}
      className={
        // simple, self-contained button styling
        `inline-flex w-full items-center justify-center rounded-xl px-4 py-2 font-semibold
         text-white bg-bc-primary hover:opacity-90 focus:outline-none focus:ring-2
         focus:ring-bc-primary/30 disabled:opacity-60 disabled:cursor-not-allowed ${className}`
      }
    >
      {label}
    </button>
  );
}