import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { branding } from "@/lib/branding";
import { formatDate } from "@/lib/date";

export const dynamic = "force-dynamic";

export default async function ViewSignedAgreementPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const agreement = await db.signedAgreement.findUnique({ where: { id } });
  if (!agreement) notFound();

  return (
    <div className="theme-light min-h-screen bg-brand-light px-4 py-10">
      <div className="mx-auto max-w-xl">
        <div className="mb-6 text-center">
          <h1 className="text-3xl font-bold tracking-tight text-ink">
            {branding.businessName}
          </h1>
          <p className="mt-1 text-zinc-600">{agreement.agreementTitle}</p>
        </div>

        <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
          <div className="rounded-xl bg-zinc-50 p-3 text-sm text-zinc-700">
            <p>
              <span className="font-semibold text-ink">Signed by:</span>{" "}
              {agreement.signerName}
            </p>
            <p className="mt-1">
              <span className="font-semibold text-ink">Date:</span>{" "}
              {formatDate(agreement.agreedAt)}
            </p>
          </div>

          <div className="mt-4 max-h-96 overflow-y-auto whitespace-pre-wrap rounded-xl bg-zinc-50 p-4 text-sm text-zinc-700">
            {agreement.agreementText}
          </div>
        </div>
      </div>
    </div>
  );
}
