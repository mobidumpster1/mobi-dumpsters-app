"use client";

import { useState } from "react";
import { StripeCardForm } from "@/components/StripeCardForm";
import { confirmCardSetup } from "./actions";

// Thin booking-flow-specific wrapper around StripeCardForm — calls the
// invoice-scoped confirm action and swaps to a success message once
// Stripe accepts the card. The webhook (setup_intent.succeeded) saves the
// same reference independently as a backstop, so this call failing to
// reach the server (closed tab, etc.) doesn't lose the card.
export function SaveCardSection({
  invoiceId,
  clientSecret,
  publishableKey,
}: {
  invoiceId: string;
  clientSecret: string;
  publishableKey: string;
}) {
  const [saved, setSaved] = useState(false);

  if (saved) {
    return <p className="text-sm font-medium text-green-700">Card saved — thanks!</p>;
  }

  return (
    <StripeCardForm
      clientSecret={clientSecret}
      publishableKey={publishableKey}
      submitLabel="Save Card"
      onSaved={async (setupIntentId) => {
        await confirmCardSetup(invoiceId, setupIntentId);
        setSaved(true);
      }}
    />
  );
}
