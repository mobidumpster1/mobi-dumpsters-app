import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { branding } from "@/lib/branding";
import { Field, inputClass } from "@/components/Field";
import { verifyPendingTwoFactorToken, PENDING_TWO_FACTOR_COOKIE } from "@/lib/auth";
import { verifyTwoFactorLogin } from "./actions";

export default async function VerifyTwoFactorPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; error?: string }>;
}) {
  const { from, error } = await searchParams;

  // No valid pending login (expired, already used, or never happened —
  // e.g. this URL loaded directly without going through /login first) —
  // send back to start over rather than showing a code prompt with
  // nothing behind it.
  const cookieStore = await cookies();
  const pending = verifyPendingTwoFactorToken(cookieStore.get(PENDING_TWO_FACTOR_COOKIE)?.value);
  if (!pending) {
    redirect("/login");
  }

  return (
    <div className="theme-light flex min-h-screen items-center justify-center bg-brand-light px-4">
      <div className="w-full max-w-sm rounded-2xl border border-zinc-200 bg-white p-8 shadow-sm">
        <h1 className="text-center text-2xl font-bold text-ink">{branding.businessName}</h1>
        <p className="mt-1 text-center text-zinc-500">Enter your 6-digit code</p>

        {error && (
          <p className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
            That code didn&apos;t work. Try again.
          </p>
        )}

        <form action={verifyTwoFactorLogin} className="mt-6 flex flex-col gap-4">
          {from && <input type="hidden" name="from" value={from} />}
          <Field label="Authenticator Code" htmlFor="code">
            <input
              id="code"
              name="code"
              type="text"
              inputMode="numeric"
              required
              autoFocus
              autoComplete="one-time-code"
              placeholder="123456"
              className={`${inputClass} text-center text-lg tracking-widest`}
            />
          </Field>
          <p className="-mt-2 text-xs text-zinc-400">
            Lost your device? Enter one of your backup codes instead.
          </p>
          <button
            type="submit"
            className="rounded-xl bg-brand px-5 py-3 text-base font-semibold text-white transition-colors hover:bg-brand-dark"
          >
            Verify
          </button>
        </form>
      </div>
    </div>
  );
}
