import { branding } from "@/lib/branding";

export default async function ThankYouPage({
  searchParams,
}: {
  searchParams: Promise<{ ref?: string }>;
}) {
  const { ref } = await searchParams;

  return (
    <div className="theme-light flex min-h-screen items-center justify-center bg-brand-light px-4">
      <div className="max-w-md rounded-2xl border border-zinc-200 bg-white p-8 text-center shadow-sm">
        <h1 className="text-2xl font-bold text-ink">Request received!</h1>
        <p className="mt-3 text-zinc-600">
          Thanks for your request. {branding.businessName} will contact you
          shortly to confirm details and payment.
        </p>
        {ref && <p className="mt-4 text-sm text-zinc-400">Reference #: {ref}</p>}
      </div>
    </div>
  );
}
