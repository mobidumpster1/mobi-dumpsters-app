import { branding } from "@/lib/branding";
import { Field, inputClass } from "@/components/Field";
import { login } from "./actions";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; error?: string }>;
}) {
  const { from, error } = await searchParams;

  return (
    <div className="flex min-h-screen items-center justify-center bg-brand-light px-4">
      <div className="w-full max-w-sm rounded-2xl border border-zinc-200 bg-white p-8 shadow-sm">
        <h1 className="text-center text-2xl font-bold text-ink">
          {branding.businessName}
        </h1>
        <p className="mt-1 text-center text-zinc-500">Staff sign in</p>

        {error && (
          <p className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
            Incorrect password. Try again.
          </p>
        )}

        <form action={login} className="mt-6 flex flex-col gap-4">
          {from && <input type="hidden" name="from" value={from} />}
          <Field label="Password" htmlFor="password">
            <input
              id="password"
              name="password"
              type="password"
              required
              autoFocus
              className={inputClass}
            />
          </Field>
          <button
            type="submit"
            className="rounded-xl bg-brand px-5 py-3 text-base font-semibold text-white transition-colors hover:bg-brand-dark"
          >
            Sign In
          </button>
        </form>
      </div>
    </div>
  );
}
