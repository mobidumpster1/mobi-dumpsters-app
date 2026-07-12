import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { formatDate } from "@/lib/date";
import { deleteSignedAgreement } from "../actions";
import { ConfirmButton } from "@/components/ConfirmButton";
import { requireUser } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function SignedAgreementDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await requireUser();
  const signed = await db.signedAgreement.findFirst({
    where: {
      id,
      OR: [
        { customer: { organizationId: user.effectiveOrganizationId } },
        { booking: { organizationId: user.effectiveOrganizationId } },
      ],
    },
    include: { customer: true, booking: true },
  });

  if (!signed) notFound();

  const deleteWithId = deleteSignedAgreement.bind(null, signed.id);

  return (
    <div className="max-w-2xl">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-ink">
            {signed.agreementTitle}
          </h1>
          <p className="mt-1 text-zinc-500">
            Signed by {signed.signerName} on {formatDate(signed.agreedAt)} at{" "}
            {signed.agreedAt.toLocaleTimeString()}
          </p>
        </div>
        <div className="flex gap-3">
          <Link
            href={`/agreements/${signed.id}/edit`}
            className="rounded-xl border border-zinc-300 px-5 py-3 text-sm font-semibold text-zinc-700 transition-colors hover:bg-zinc-50"
          >
            Edit
          </Link>
          <form action={deleteWithId}>
            <ConfirmButton
              message="Delete this signed agreement? This can't be undone."
              className="rounded-xl border border-red-200 px-5 py-3 text-sm font-semibold text-red-600 transition-colors hover:bg-red-50"
            >
              Delete
            </ConfirmButton>
          </form>
        </div>
      </div>

      <dl className="mt-6 grid grid-cols-2 gap-4 rounded-lg border-2 border-zinc-900 bg-white p-5 text-sm sm:grid-cols-3">
        <div>
          <dt className="text-zinc-500">Signer Email</dt>
          <dd className="text-zinc-900">{signed.signerEmail ?? "—"}</dd>
        </div>
        <div>
          <dt className="text-zinc-500">Signer Phone</dt>
          <dd className="text-zinc-900">{signed.signerPhone ?? "—"}</dd>
        </div>
        <div>
          <dt className="text-zinc-500">Service Address</dt>
          <dd className="text-zinc-900">{signed.signerAddress ?? "—"}</dd>
        </div>
        <div>
          <dt className="text-zinc-500">IP Address</dt>
          <dd className="text-zinc-900">{signed.ipAddress ?? "—"}</dd>
        </div>
        <div>
          <dt className="text-zinc-500">Customer</dt>
          <dd className="text-zinc-900">
            {signed.customer ? (
              <Link
                href={`/customers/${signed.customer.id}`}
                className="hover:underline"
              >
                {signed.customer.name}
              </Link>
            ) : (
              "—"
            )}
          </dd>
        </div>
        <div>
          <dt className="text-zinc-500">Booking</dt>
          <dd className="text-zinc-900">
            {signed.booking ? (
              <Link
                href={`/bookings/${signed.booking.id}`}
                className="hover:underline"
              >
                View booking
              </Link>
            ) : (
              "—"
            )}
          </dd>
        </div>
      </dl>

      {signed.signatureUrl && (
        <>
          <h2 className="mt-8 text-xl font-black text-ink">Signature</h2>
          <div className="mt-3 inline-block rounded-lg border-2 border-zinc-900 bg-white p-4">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={signed.signatureUrl}
              alt={`${signed.signerName}'s signature`}
              className="h-32 w-auto"
            />
          </div>
        </>
      )}

      <h2 className="mt-8 text-xl font-black text-ink">
        Agreement Text (as signed)
      </h2>
      <div className="mt-3 whitespace-pre-wrap rounded-lg border-2 border-zinc-900 bg-white p-5 text-sm text-zinc-700">
        {signed.agreementText}
      </div>
    </div>
  );
}
