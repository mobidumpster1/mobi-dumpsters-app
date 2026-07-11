import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { Field, inputClass } from "@/components/Field";
import { updateSignedAgreement } from "../../actions";
import { requireUser } from "@/lib/session";

export const dynamic = "force-dynamic";

function toDateTimeLocal(date: Date) {
  const offset = date.getTimezoneOffset();
  const local = new Date(date.getTime() - offset * 60000);
  return local.toISOString().slice(0, 16);
}

export default async function EditSignedAgreementPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await requireUser();
  const [signed, customers] = await Promise.all([
    db.signedAgreement.findFirst({
      where: {
        id,
        OR: [
          { customer: { organizationId: user.effectiveOrganizationId } },
          { booking: { organizationId: user.effectiveOrganizationId } },
        ],
      },
    }),
    db.customer.findMany({
      where: { organizationId: user.effectiveOrganizationId },
      orderBy: { name: "asc" },
    }),
  ]);

  if (!signed) notFound();

  const updateWithId = updateSignedAgreement.bind(null, signed.id);

  return (
    <div className="max-w-2xl">
      <h1 className="text-3xl font-black tracking-tight text-ink">Edit Signed Agreement</h1>
      <form action={updateWithId} className="mt-6 flex flex-col gap-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Signer Name" htmlFor="signerName">
            <input
              id="signerName"
              name="signerName"
              defaultValue={signed.signerName}
              required
              className={inputClass}
            />
          </Field>
          <Field label="Signed Date &amp; Time" htmlFor="agreedAt">
            <input
              id="agreedAt"
              name="agreedAt"
              type="datetime-local"
              defaultValue={toDateTimeLocal(signed.agreedAt)}
              required
              className={inputClass}
            />
          </Field>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Signer Email" htmlFor="signerEmail">
            <input
              id="signerEmail"
              name="signerEmail"
              type="email"
              defaultValue={signed.signerEmail ?? ""}
              className={inputClass}
            />
          </Field>
          <Field label="Signer Phone" htmlFor="signerPhone">
            <input
              id="signerPhone"
              name="signerPhone"
              type="tel"
              defaultValue={signed.signerPhone ?? ""}
              className={inputClass}
            />
          </Field>
        </div>

        <Field label="Service Address" htmlFor="signerAddress">
          <input
            id="signerAddress"
            name="signerAddress"
            defaultValue={signed.signerAddress ?? ""}
            className={inputClass}
          />
        </Field>

        <Field label="Linked Customer (optional)" htmlFor="customerId">
          <select
            id="customerId"
            name="customerId"
            defaultValue={signed.customerId ?? ""}
            className={inputClass}
          >
            <option value="">— None —</option>
            {customers.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Agreement Title" htmlFor="agreementTitle">
          <input
            id="agreementTitle"
            name="agreementTitle"
            defaultValue={signed.agreementTitle}
            required
            className={inputClass}
          />
        </Field>

        <Field label="Agreement Text (as signed)" htmlFor="agreementText">
          <textarea
            id="agreementText"
            name="agreementText"
            rows={12}
            defaultValue={signed.agreementText}
            required
            className={inputClass}
          />
        </Field>

        <div className="flex gap-3">
          <button
            type="submit"
            className="rounded-lg bg-brand px-5 py-3 text-sm font-bold text-white transition-colors hover:bg-brand-dark"
          >
            Save Changes
          </button>
          <Link
            href={`/agreements/${signed.id}`}
            className="rounded-xl border border-zinc-300 px-5 py-3 text-sm font-semibold text-zinc-700 transition-colors hover:bg-zinc-50"
          >
            Cancel
          </Link>
        </div>
      </form>
    </div>
  );
}
