import Link from "next/link";
import { branding } from "@/lib/branding";
import { applyEmailVerification } from "@/lib/verification";

export default async function VerifyEmailPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;
  const result = token ? await applyEmailVerification(token) : { ok: false as const, error: "Missing verification link." };

  return (
    <div className="theme-light flex min-h-screen items-center justify-center bg-brand-light px-4">
      <div className="w-full max-w-sm rounded-2xl border border-zinc-200 bg-white p-8 text-center shadow-sm">
        <h1 className="text-2xl font-bold text-ink">{branding.businessName}</h1>

        {result.ok ? (
          <>
            <p className="mt-4 rounded-xl bg-green-50 px-4 py-3 text-sm text-green-700">
              Your email is verified.
            </p>
            <Link
              href="/"
              className="mt-6 inline-block rounded-xl bg-brand px-5 py-3 text-base font-semibold text-white transition-colors hover:bg-brand-dark"
            >
              Go to the app
            </Link>
          </>
        ) : (
          <>
            <p className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
              {result.error}
            </p>
            <p className="mt-4 text-sm text-zinc-500">
              You can request a new link from inside the app once you sign in.
            </p>
            <Link
              href="/login"
              className="mt-6 inline-block font-semibold text-brand hover:underline"
            >
              Sign in
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
