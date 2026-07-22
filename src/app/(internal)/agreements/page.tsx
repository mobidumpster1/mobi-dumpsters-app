import Link from "next/link";
import { db } from "@/lib/db";
import { formatDate } from "@/lib/date";
import { requireUser } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function AgreementsPage() {
  const user = await requireUser();
  // SignedAgreement has no organizationId of its own — it's scoped through
  // whichever of customer/booking it's linked to (in practice always at
  // least the customer, but both are optional on the model).
  const signed = await db.signedAgreement.findMany({
    where: {
      OR: [
        { customer: { organizationId: user.effectiveOrganizationId } },
        { booking: { organizationId: user.effectiveOrganizationId } },
      ],
    },
    orderBy: { agreedAt: "desc" },
    include: { customer: true, booking: true },
  });

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-ink">
            Signed Agreements
          </h1>
          <p className="mt-1 text-zinc-500">
            Every signature collected online or via a shareable link.
          </p>
        </div>
        <a
          href="/agreement/sign"
          target="_blank"
          rel="noopener noreferrer"
          className="rounded-lg bg-brand px-5 py-3 text-sm font-bold text-white transition-colors hover:bg-brand-dark"
        >
          Open Signing Link
        </a>
      </div>

      {/* Mobile: card list */}
      <div className="mt-6 flex flex-col gap-3 md:hidden">
        {signed.map((s) => (
          <Link
            key={s.id}
            href={`/agreements/${s.id}`}
            className="block rounded-lg border-2 border-zinc-900 bg-white p-4"
          >
            <div className="flex items-center justify-between gap-2">
              <span className="font-medium text-zinc-900">{s.signerName}</span>
              <span className="flex-shrink-0 text-xs text-zinc-500">
                {formatDate(s.agreedAt)}
              </span>
            </div>
            <dl className="mt-2 flex flex-col gap-1 text-sm">
              <div className="flex justify-between gap-2">
                <dt className="text-zinc-500">Customer</dt>
                <dd className="truncate text-zinc-700">
                  {s.customer?.name ?? "—"}
                </dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt className="text-zinc-500">Booking</dt>
                <dd className="text-zinc-700">{s.booking ? "Linked" : "—"}</dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt className="text-zinc-500">Agreement</dt>
                <dd className="truncate text-zinc-700">{s.agreementTitle}</dd>
              </div>
            </dl>
          </Link>
        ))}
        {signed.length === 0 && (
          <p className="rounded-2xl border border-dashed border-zinc-300 p-6 text-center text-zinc-400">
            No signatures collected yet — share the signing link above.
          </p>
        )}
      </div>

      {/* Tablet/desktop: table */}
      <div className="mt-6 hidden overflow-x-auto rounded-lg border-2 border-zinc-900 bg-white md:block">
        <table className="w-full text-left text-sm">
          <thead className="bg-zinc-50 text-zinc-500">
            <tr>
              <th className="px-5 py-3.5 font-semibold">Signed</th>
              <th className="px-5 py-3.5 font-semibold">Name</th>
              <th className="px-5 py-3.5 font-semibold">Customer</th>
              <th className="px-5 py-3.5 font-semibold">Booking</th>
              <th className="px-5 py-3.5 font-semibold">Agreement</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {signed.map((s) => (
              <tr key={s.id} className="hover:bg-zinc-50">
                <td className="px-5 py-4">
                  <Link
                    href={`/agreements/${s.id}`}
                    className="font-medium text-zinc-900 hover:underline"
                  >
                    {formatDate(s.agreedAt)}
                  </Link>
                </td>
                <td className="px-5 py-4 text-zinc-600">{s.signerName}</td>
                <td className="px-5 py-4 text-zinc-600">
                  {s.customer ? (
                    <Link
                      href={`/customers/${s.customer.id}`}
                      className="hover:underline"
                    >
                      {s.customer.name}
                    </Link>
                  ) : (
                    "—"
                  )}
                </td>
                <td className="px-5 py-4 text-zinc-600">
                  {s.booking ? (
                    <Link
                      href={`/bookings/${s.booking.id}`}
                      className="hover:underline"
                    >
                      View booking
                    </Link>
                  ) : (
                    "—"
                  )}
                </td>
                <td className="px-5 py-4 text-zinc-600">{s.agreementTitle}</td>
              </tr>
            ))}
            {signed.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-zinc-400">
                  No signatures collected yet — share the signing link above.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
