import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { getOrgBranding } from "@/lib/orgBranding";
import { branding as staticBranding } from "@/lib/branding";
import { DemolitionAgreementDocument } from "@/components/DemolitionAgreementDocument";
import { DemolitionAgreementSign } from "./DemolitionAgreementSign";

export const dynamic = "force-dynamic";

export default async function PublicDemolitionAgreementPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const agreement = await db.demolitionAgreement.findUnique({ where: { publicToken: token } });
  if (!agreement) notFound();

  const branding = await getOrgBranding(agreement.organizationId);
  const signed = agreement.status === "signed";

  return (
    <div className="theme-light min-h-screen bg-brand-light px-4 py-10">
      <div className="mx-auto max-w-2xl">
        <div className="mb-6 text-center">
          <h1 className="text-3xl font-bold tracking-tight text-ink">{branding.businessName}</h1>
          <p className="mt-1 text-zinc-600">Demolition Service Agreement &amp; Liability Waiver</p>
        </div>

        <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
          <div className="max-h-[32rem] overflow-y-auto rounded-xl bg-zinc-50 p-4">
            <DemolitionAgreementDocument
              businessName={branding.businessName}
              data={{
                structureDescription: agreement.structureDescription,
                propertyAddress: agreement.propertyAddress,
                dimensions: agreement.dimensions,
                foundationRemovalIncluded: agreement.foundationRemovalIncluded,
                quotedPrice: agreement.quotedPrice,
                depositDue: agreement.depositDue,
                balanceDue: agreement.balanceDue,
                staffSignerName: agreement.staffSignerName,
                staffSignedAt: agreement.staffSignedAt,
                status: agreement.status,
                customerName: agreement.customerName,
                serviceDate: agreement.serviceDate,
                serviceAddress: agreement.serviceAddress,
                signedAt: agreement.signedAt,
              }}
            />
          </div>

          {signed ? (
            <p className="mt-6 rounded-xl bg-green-50 px-4 py-3 text-sm text-green-700">
              This agreement was signed by {agreement.customerName} on{" "}
              {agreement.signedAt?.toLocaleDateString()}. {branding.businessName} has a
              copy on file.
            </p>
          ) : (
            <DemolitionAgreementSign publicToken={agreement.publicToken} />
          )}
        </div>

        <p className="mt-6 text-center text-xs text-zinc-400">
          Questions? Call or text us at {staticBranding.smsPhone}.
        </p>
      </div>
    </div>
  );
}
