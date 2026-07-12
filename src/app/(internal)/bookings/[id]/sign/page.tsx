import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { getAgreementSettings } from "@/lib/agreement";
import { signAgreementForBooking } from "../../actions";
import { Field, inputClass } from "@/components/Field";
import { SignaturePad } from "@/components/SignaturePad";
import { requireUser } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function SignAgreementForBookingPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await requireUser();
  const booking = await db.booking.findFirst({
    where: { id, organizationId: user.effectiveOrganizationId },
    include: { customer: true },
  });

  if (!booking) notFound();

  const agreement = await getAgreementSettings(user.effectiveOrganizationId);
  const signWithId = signAgreementForBooking.bind(null, booking.id);

  return (
    <div className="max-w-xl">
      <Link
        href={`/bookings/${booking.id}`}
        className="text-sm font-semibold text-brand hover:underline"
      >
        ← Back to Booking
      </Link>
      <h1 className="mt-2 text-3xl font-black tracking-tight text-ink">
        {agreement.title}
      </h1>
      <p className="mt-1 text-zinc-500">
        For {booking.customer.name} — hand the device over for the customer
        to sign below.
      </p>

      <div className="mt-6 max-h-80 overflow-y-auto whitespace-pre-wrap rounded-lg border-2 border-zinc-900 bg-white p-5 text-sm text-zinc-700">
        {agreement.content}
      </div>

      <form action={signWithId} className="mt-6 flex flex-col gap-4">
        <Field label="Printed Name" htmlFor="signerName">
          <input
            id="signerName"
            name="signerName"
            required
            defaultValue={booking.customer.name}
            className={inputClass}
          />
        </Field>

        <Field label="Signature" htmlFor="signature">
          <SignaturePad
            name="signatureUrl"
            folder={`agreements/${booking.id}`}
            required
          />
        </Field>

        <button
          type="submit"
          className="rounded-xl bg-brand px-5 py-4 text-base font-bold text-white transition-colors hover:bg-brand-dark"
        >
          Save Signature
        </button>
      </form>
    </div>
  );
}
