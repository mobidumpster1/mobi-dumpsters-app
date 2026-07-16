"use client";

import { useState } from "react";
import { StripeCardForm } from "@/components/StripeCardForm";
import { startCustomerCardSetup, confirmCustomerCardSetup } from "./actions";

// For phone bookings or backfilling a card on an existing customer — the
// same underlying SetupIntent flow the booking page uses, just started on
// click instead of eagerly on page load (staff may view this page many
// times without ever needing to touch the card).
export function CardOnFileSection({
  customerId,
  cardBrand,
  cardLast4,
}: {
  customerId: string;
  cardBrand: string | null;
  cardLast4: string | null;
}) {
  const [setup, setSetup] = useState<{ clientSecret: string; publishableKey: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  async function startAdding() {
    setError(null);
    try {
      setSetup(await startCustomerCardSetup(customerId));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't start card setup.");
    }
  }

  if (saved) {
    return <p className="text-sm font-medium text-green-700">Card saved.</p>;
  }

  if (setup) {
    return (
      <div className="max-w-sm">
        <StripeCardForm
          clientSecret={setup.clientSecret}
          publishableKey={setup.publishableKey}
          submitLabel={cardBrand ? "Replace Card" : "Save Card"}
          onSaved={async (setupIntentId) => {
            await confirmCustomerCardSetup(customerId, setupIntentId);
            setSaved(true);
          }}
        />
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      {cardBrand && cardLast4 ? (
        <p className="text-sm text-zinc-700">
          <span className="font-medium capitalize">{cardBrand}</span> ····{cardLast4}
        </p>
      ) : (
        <p className="text-sm text-zinc-400">No card on file.</p>
      )}
      <button
        type="button"
        onClick={startAdding}
        className="text-sm font-semibold text-brand hover:underline"
      >
        {cardBrand ? "Replace Card" : "Add a Card"}
      </button>
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}
