import Link from "next/link";
import type { SetupChecklist as Checklist } from "@/lib/onboarding";

// "Get your booking page live": shown to the owner on the Today page until the
// required steps are done, then it disappears. Each step links to where it's
// done and ticks itself off from real data.
export function SetupChecklist({ checklist }: { checklist: Checklist }) {
  const percent = Math.round((checklist.requiredDone / checklist.requiredTotal) * 100);
  const nextStep = checklist.steps.find((step) => step.required && !step.done);

  return (
    <section
      aria-labelledby="setup-heading"
      className="rounded-2xl border border-[var(--app-line)] bg-white p-5 shadow-sm"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 id="setup-heading" className="text-xl text-ink">
            Get your booking page live
          </h2>
          <p className="mt-1 text-sm text-zinc-500">
            {checklist.requiredDone} of {checklist.requiredTotal} steps done. Customers can book once these are finished.
          </p>
        </div>
        {nextStep && (
          <Link
            href={nextStep.href}
            className="inline-flex min-h-11 items-center justify-center rounded-xl bg-accent px-5 text-sm font-bold text-accent-ink transition-all hover:brightness-105 active:scale-[0.99]"
          >
            Next: {nextStep.label}
          </Link>
        )}
      </div>

      <div
        className="mt-4 h-2 overflow-hidden rounded-full bg-zinc-100"
        role="progressbar"
        aria-valuenow={percent}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label="Setup progress"
      >
        <div className="h-full rounded-full bg-brand" style={{ width: `${percent}%` }} />
      </div>

      <ul className="mt-4 grid gap-2 sm:grid-cols-2">
        {checklist.steps.map((step) => (
          <li key={step.id}>
            <Link
              href={step.href}
              className={`flex min-h-14 items-start gap-3 rounded-xl border px-3 py-2.5 transition-colors hover:bg-zinc-50 ${
                step.done ? "border-zinc-200 bg-zinc-50/60" : "border-zinc-300"
              }`}
            >
              <span
                aria-hidden="true"
                className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border text-[11px] font-black ${
                  step.done ? "border-green-600 bg-green-600 text-white" : "border-zinc-400 text-transparent"
                }`}
              >
                ✓
              </span>
              <span className="min-w-0">
                <span className={`block text-sm font-semibold ${step.done ? "text-zinc-500 line-through" : "text-ink"}`}>
                  {step.label}
                  {!step.required && <span className="ml-2 text-xs font-semibold text-zinc-500 no-underline">Optional</span>}
                </span>
                {!step.done && <span className="block text-xs text-zinc-500">{step.hint}</span>}
                <span className="sr-only">{step.done ? "Done" : "Not done yet"}</span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
