"use client";

import { useState, type FormEvent } from "react";
import { loadStripe, type Stripe as StripeJsInstance } from "@stripe/stripe-js";
import { Elements, CardElement, useStripe, useElements } from "@stripe/react-stripe-js";

// loadStripe should only run once per publishable key — re-running it on
// every render creates a new Stripe.js instance each time, which breaks
// Elements' internal state.
let cached: { key: string; promise: Promise<StripeJsInstance | null> } | null = null;
function getStripePromise(publishableKey: string) {
  if (cached?.key !== publishableKey) {
    cached = { key: publishableKey, promise: loadStripe(publishableKey) };
  }
  return cached.promise;
}

function CardFormInner({
  clientSecret,
  onSaved,
  submitLabel,
}: {
  clientSecret: string;
  onSaved: (setupIntentId: string) => void;
  submitLabel: string;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!stripe || !elements) return;
    const cardElement = elements.getElement(CardElement);
    if (!cardElement) return;

    setSaving(true);
    setError(null);
    const { error: stripeError, setupIntent } = await stripe.confirmCardSetup(clientSecret, {
      payment_method: { card: cardElement },
    });
    setSaving(false);

    if (stripeError) {
      setError(stripeError.message ?? "Couldn't save the card — check the details and try again.");
      return;
    }
    if (setupIntent?.status === "succeeded") {
      onSaved(setupIntent.id);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
      <div className="rounded-lg border border-zinc-300 bg-white px-3 py-3.5">
        {/* fontSize 16px avoids the iOS auto-zoom-on-focus behavior any
            typed field under that size triggers — same reasoning applies
            here even though this renders inside Stripe's own iframe. */}
        <CardElement options={{ style: { base: { fontSize: "16px" } } }} />
      </div>
      {error && <p className="text-xs text-red-600">{error}</p>}
      <button
        type="submit"
        disabled={!stripe || saving}
        className="rounded-xl bg-brand px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-brand-dark disabled:opacity-60"
      >
        {saving ? "Saving…" : submitLabel}
      </button>
    </form>
  );
}

// Collects a card via Stripe Elements — this app never sees the raw card
// number, only Stripe's own tokenized reference. clientSecret comes from a
// SetupIntent created server-side for a specific customer (see
// createSetupIntent in src/lib/stripe.ts); onSaved fires with the
// confirmed SetupIntent's id once Stripe accepts the card, for the caller
// to persist (savePaymentMethodFromSetupIntent) — the Stripe webhook also
// does this independently as a backstop.
export function StripeCardForm({
  clientSecret,
  publishableKey,
  onSaved,
  submitLabel = "Save Card",
}: {
  clientSecret: string;
  publishableKey: string;
  onSaved: (setupIntentId: string) => void;
  submitLabel?: string;
}) {
  return (
    <Elements stripe={getStripePromise(publishableKey)}>
      <CardFormInner clientSecret={clientSecret} onSaved={onSaved} submitLabel={submitLabel} />
    </Elements>
  );
}
