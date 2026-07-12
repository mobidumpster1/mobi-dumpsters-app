import Link from "next/link";
import { branding } from "@/lib/branding";
import { Field, inputClass } from "@/components/Field";
import { isPasswordResetTokenValid } from "@/lib/verification";
import { resetPassword } from "./actions";

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string; error?: string }>;
}) {
  const { token, error } = await searchParams;
  const valid = token ? await isPasswordResetTokenValid(token) : false;

  return (
    <div className="theme-light flex min-h-screen items-center justify-center bg-brand-light px-4">
      <div className="w-full max-w-sm rounded-2xl border border-zinc-200 bg-white p-8 shadow-sm">
        <h1 className="text-center text-2xl font-bold text-ink">{branding.businessName}</h1>
        <p className="mt-1 text-center text-zinc-500">Choose a new password</p>

        {error && (
          <p className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>
        )}

        {valid && token ? (
          <form action={resetPassword} className="mt-6 flex flex-col gap-4">
            <input type="hidden" name="token" value={token} />
            <Field label="New Password" htmlFor="password">
              <input
                id="password"
                name="password"
                type="password"
                required
                minLength={8}
                autoFocus
                autoComplete="new-password"
                className={inputClass}
              />
            </Field>
            <Field label="Confirm Password" htmlFor="confirmPassword">
              <input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                required
                minLength={8}
                autoComplete="new-password"
                className={inputClass}
              />
            </Field>
            <p className="-mt-2 text-xs text-zinc-500">At least 8 characters.</p>
            <button
              type="submit"
              className="rounded-xl bg-brand px-5 py-3 text-base font-semibold text-white transition-colors hover:bg-brand-dark"
            >
              Set New Password
            </button>
          </form>
        ) : (
          !error && (
            <p className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
              This reset link is invalid or has expired.
            </p>
          )
        )}

        <p className="mt-6 text-center text-sm text-zinc-500">
          <Link href="/forgot-password" className="font-semibold text-brand hover:underline">
            Request a new link
          </Link>
        </p>
      </div>
    </div>
  );
}
