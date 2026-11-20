"use client";

import Link from "next/link";
import { useEffect } from "react";

// Shown when something on a logged-in page fails (a booking that conflicts
// with another, a missing required field, a lost connection). Without this the
// whole app falls back to a bare "Application error" page. In production
// Next.js hides the technical message, so this explains the next step in plain
// words instead of leaving the person stranded.
export default function InternalError({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="mx-auto mt-10 max-w-lg rounded-2xl border border-[var(--app-line)] bg-white p-6 shadow-sm">
      <h1 className="text-2xl text-ink">That didn&apos;t go through</h1>
      <p className="mt-2 text-sm text-zinc-600">
        Something stopped that from saving. Nothing was lost on the page you were on before this. Common reasons: the
        equipment you picked is already booked for those dates, a required detail is missing, or the connection
        dropped.
      </p>
      <p className="mt-2 text-sm text-zinc-600">
        Go back, check the details and try again. If it keeps happening, tell us what you were doing
        {error.digest ? ` and quote this reference: ${error.digest}` : ""}.
      </p>
      <div className="mt-5 flex flex-wrap gap-3">
        <button
          type="button"
          onClick={() => unstable_retry()}
          className="inline-flex min-h-11 items-center justify-center rounded-xl bg-accent px-5 text-sm font-bold text-accent-ink transition-all hover:brightness-105 active:scale-[0.99]"
        >
          Try again
        </button>
        <button
          type="button"
          onClick={() => window.history.back()}
          className="inline-flex min-h-11 items-center justify-center rounded-xl border border-zinc-300 px-5 text-sm font-semibold text-zinc-700 hover:bg-zinc-50"
        >
          Go back
        </button>
        <Link
          href="/"
          className="inline-flex min-h-11 items-center justify-center rounded-xl px-3 text-sm font-semibold text-brand hover:underline"
        >
          Today
        </Link>
      </div>
    </div>
  );
}
