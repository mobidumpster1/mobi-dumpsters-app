import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { requireUser, hasPermission } from "@/lib/session";
import { getOrgBranding } from "@/lib/orgBranding";
import { deleteDemolitionAgreement } from "../actions";
import { ConfirmButton } from "@/components/ConfirmButton";
import { CopyLinkButton } from "@/components/CopyLinkButton";
import { PrintReportButton } from "@/components/PrintReportButton";
import { DemolitionAgreementDocument } from "@/components/DemolitionAgreementDocument";

export const dynamic = "force-dynamic";

export default async function DemolitionAgreementDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await requireUser();
  const [agreement, branding] = await Promise.all([
    db.demolitionAgreement.findFirst({
      where: { id, organizationId: user.effectiveOrganizationId },
      include: { customer: true, booking: true },
    }),
    getOrgBranding(user.effectiveOrganizationId),
  ]);
  if (!agreement) notFound();

  const canDelete = hasPermission(user, "canDeleteRecords");
  const deleteWithId = deleteDemolitionAgreement.bind(null, agreement.id);
  const signed = agreement.status === "signed";

  return (
    <div className="max-w-2xl">
      <div className="flex flex-wrap items-start justify-between gap-3 print:hidden">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-ink">
            {agreement.structureDescription}
          </h1>
          <p className="mt-1 text-zinc-500">{agreement.propertyAddress}</p>
        </div>
        <div className="flex flex-wrap gap-3">
          {!signed && (
            <Link
              href={`/demolition-agreements/${agreement.id}/edit`}
              className="rounded-xl border border-zinc-300 px-5 py-3 text-sm font-semibold text-zinc-700 transition-colors hover:bg-zinc-50"
            >
              Edit
            </Link>
          )}
          <PrintReportButton />
          {canDelete && (
            <form action={deleteWithId}>
              <ConfirmButton
                message="Delete this demolition agreement? This can't be undone."
                className="rounded-xl border border-red-200 px-5 py-3 text-sm font-semibold text-red-600 transition-colors hover:bg-red-50"
              >
                Delete
              </ConfirmButton>
            </form>
          )}
        </div>
      </div>

      <div className="mt-4 flex items-center gap-2 print:hidden">
        <span
          className={`inline-block rounded-full px-3 py-1 text-xs font-black capitalize ${signed ? "bg-green-600 text-white" : "bg-amber-500 text-white"}`}
        >
          {agreement.status}
        </span>
        {!signed && (
          <span className="text-sm text-zinc-500">
            Waiting on the customer to fill in their info and sign.
          </span>
        )}
      </div>

      {!signed && (
        <div className="mt-4 rounded-lg border-2 border-zinc-900 bg-white p-5 print:hidden">
          <h2 className="text-lg font-black text-ink">Signing Link</h2>
          <p className="mt-1 text-sm text-zinc-500">
            Send this to the customer — they&apos;ll see the full agreement, fill in
            their info, and sign. You&apos;ll get an email as soon as it&apos;s signed.
          </p>
          <CopyLinkButton
            path={`/demolition-agreement/${agreement.publicToken}`}
            label="Copy Signing Link"
            className="mt-3 inline-block rounded-lg bg-brand px-5 py-3 text-sm font-bold text-white transition-colors hover:bg-brand-dark"
          />
        </div>
      )}

      {(agreement.customer || signed) && (
        <dl className="mt-4 grid grid-cols-2 gap-4 rounded-lg border-2 border-zinc-900 bg-white p-5 text-sm sm:grid-cols-3 print:hidden">
          {agreement.customer && (
            <div>
              <dt className="text-zinc-500">Customer on file</dt>
              <dd className="text-zinc-900">
                <Link href={`/customers/${agreement.customer.id}`} className="hover:underline">
                  {agreement.customer.name}
                </Link>
              </dd>
            </div>
          )}
          {signed && (
            <>
              <div>
                <dt className="text-zinc-500">Phone</dt>
                <dd className="text-zinc-900">{agreement.customerPhone ?? "—"}</dd>
              </div>
              <div>
                <dt className="text-zinc-500">Email</dt>
                <dd className="text-zinc-900">{agreement.customerEmail ?? "—"}</dd>
              </div>
              <div>
                <dt className="text-zinc-500">IP address</dt>
                <dd className="text-zinc-900">{agreement.signerIpAddress ?? "—"}</dd>
              </div>
            </>
          )}
        </dl>
      )}

      <h2 className="mt-8 text-xl font-black text-ink print:hidden">Full Agreement</h2>
      <div className="mt-3 rounded-lg border-2 border-zinc-900 bg-white p-5 print:border-0 print:p-0">
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
    </div>
  );
}
