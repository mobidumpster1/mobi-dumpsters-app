import Link from "next/link";
import { db } from "@/lib/db";
import { formatDate } from "@/lib/date";

export const dynamic = "force-dynamic";

export default async function AgreementsPage() {
  const signed = await db.signedAgreement.findMany({
    orderBy: { agreedAt: "desc" },
    include: { customer: true, booking: true },
  });

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-ink">
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
          className="rounded-xl bg-brand px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-brand-dark"
        >
          Open Signing Link
        </a>
      </div>

      <div className="mt-6 overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
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
                  No signatures collected yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
