import Link from "next/link";
import { Field, inputClass } from "@/components/Field";
import { signup } from "./actions";

export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <div className="theme-light flex min-h-screen items-center justify-center bg-brand-light px-4 py-10">
      <div className="w-full max-w-sm rounded-2xl border border-zinc-200 bg-white p-8 shadow-sm">
        <h1 className="text-center text-2xl font-bold text-ink">
          Create your account
        </h1>
        <p className="mt-1 text-center text-zinc-500">
          Set up your business in a couple minutes.
        </p>

        {error && (
          <p className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </p>
        )}

        <form action={signup} className="mt-6 flex flex-col gap-4">
          <Field label="Business Name" htmlFor="businessName">
            <input
              id="businessName"
              name="businessName"
              required
              autoFocus
              className={inputClass}
            />
          </Field>
          <Field label="Your Name" htmlFor="name">
            <input id="name" name="name" required className={inputClass} />
          </Field>
          <Field label="Email" htmlFor="email">
            <input
              id="email"
              name="email"
              type="email"
              required
              autoComplete="username"
              className={inputClass}
            />
          </Field>
          <Field label="Password" htmlFor="password">
            <input
              id="password"
              name="password"
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
            Create Account
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-zinc-500">
          Already have an account?{" "}
          <Link href="/login" className="font-semibold text-brand hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
