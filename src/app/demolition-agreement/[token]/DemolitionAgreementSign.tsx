"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Field, inputClass } from "@/components/Field";
import { submitDemolitionSignature } from "./actions";

// Calls the submit action directly (not via <form action>) so a validation
// throw shows inline instead of Next's generic error page. On success,
// router.refresh() re-fetches the server component instead of navigating
// away — the page's own "signed" branch (with the customer's filled-in
// info rendered into the document above) becomes the confirmation state,
// so there's only one place that ever renders "already signed," not two
// that could drift out of sync.
export function DemolitionAgreementSign({ publicToken }: { publicToken: string }) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await submitDemolitionSignature(publicToken, new FormData(e.currentTarget));
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't submit your signature.");
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4">
      <Field label="Full Name" htmlFor="customerName">
        <input id="customerName" name="customerName" required className={inputClass} />
      </Field>
      <Field label="Phone Number" htmlFor="customerPhone">
        <input
          id="customerPhone"
          name="customerPhone"
          type="tel"
          required
          className={inputClass}
        />
      </Field>
      <Field label="Email Address" htmlFor="customerEmail">
        <input
          id="customerEmail"
          name="customerEmail"
          type="email"
          required
          className={inputClass}
        />
      </Field>
      <Field label="Service Date (if known)" htmlFor="serviceDate">
        <input id="serviceDate" name="serviceDate" type="date" className={inputClass} />
      </Field>
      <Field label="Service Address" htmlFor="serviceAddress">
        <input id="serviceAddress" name="serviceAddress" required className={inputClass} />
      </Field>

      <label className="flex items-start gap-3 text-sm text-zinc-700">
        <input
          type="checkbox"
          name="agreed"
          required
          className="mt-1 h-5 w-5 flex-shrink-0 rounded border-zinc-300"
        />
        I have read and agree to the Demolition Service Agreement and Liability Waiver
        above. Typing my name and checking this box serves as my electronic signature.
      </label>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <button
        type="submit"
        disabled={submitting}
        className="rounded-xl bg-brand px-5 py-3 text-base font-semibold text-white transition-colors hover:bg-brand-dark disabled:opacity-60"
      >
        {submitting ? "Signing…" : "Sign Agreement"}
      </button>
    </form>
  );
}
