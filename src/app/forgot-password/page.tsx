import Link from "next/link";
import { branding } from "@/lib/branding";
import { Field, inputClass } from "@/components/Field";
import { requestPasswordReset } from "./actions";

export default async function ForgotPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ sent?: string }>;
}) {
  const { sent } = await searchParams;

  return (
    <div className="theme-light flex min-h-screen items-center justify-center bg-brand-light px-4">
      <div className="w-full max-w-sm rounded-2xl border border-zinc-200 bg-white p-8 shadow-sm">
        <h1 className="text-center text-2xl font-bold text-ink">{branding.businessName}</h1>
        <p className="mt-1 text-center text-zinc-500">Reset your password</p>

        {sent ? (
          <p className="mt-6 rounded-xl bg-green-50 px-4 py-3 text-sm text-green-700">
            If an account exists for that email, we&apos;ve sent a link to reset your password.
          </p>
        ) : (
          <form action={requestPasswordReset} className="mt-6 flex flex-col gap-4">
            <Field label="Email" htmlFor="email">
              <input
                id="email"
                name="email"
                type="email"
                required
                autoFocus
                autoComplete="username"
                className={inputClass}
              />
            </Field>
            <button
              type="submit"
              className="rounded-xl bg-brand px-5 py-3 text-base font-semibold text-white transition-colors hover:bg-brand-dark"
            >
              Send Reset Link
            </button>
          </form>
        )}

        <p className="mt-6 text-center text-sm text-zinc-500">
          <Link href="/login" className="font-semibold text-brand hover:underline">
            Back to sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
