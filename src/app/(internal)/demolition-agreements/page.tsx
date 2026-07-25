import Link from "next/link";
import { db } from "@/lib/db";
import { formatDate } from "@/lib/date";
import { requireUser } from "@/lib/session";

export const dynamic = "force-dynamic";

const STATUS_STYLES: Record<string, string> = {
  sent: "bg-amber-500 text-white",
  signed: "bg-green-600 text-white",
};

export default async function DemolitionAgreementsPage() {
  const user = await requireUser();
  const agreements = await db.demolitionAgreement.findMany({
    where: { organizationId: user.effectiveOrganizationId },
    orderBy: { createdAt: "desc" },
    include: { customer: true },
  });

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-ink">
            Demolition Agreements
          </h1>
          <p className="mt-1 text-zinc-500">
            Fill in the project and price, send the link, and it comes back signed —
            with a copy emailed to you.
          </p>
        </div>
        <Link
          href="/demolition-agreements/new"
          className="rounded-lg bg-brand px-5 py-3 text-sm font-bold text-white transition-colors hover:bg-brand-dark"
        >
          + New Agreement
        </Link>
      </div>

      {/* Mobile: card list */}
      <div className="mt-6 flex flex-col gap-3 md:hidden">
        {agreements.map((a) => (
          <Link
            key={a.id}
            href={`/demolition-agreements/${a.id}`}
            className="block rounded-lg border-2 border-zinc-900 bg-white p-4"
          >
            <div className="flex items-center justify-between gap-2">
              <span className="font-medium text-zinc-900">{a.structureDescription}</span>
              <span
                className={`inline-block flex-shrink-0 rounded-full px-2 py-0.5 text-xs font-black capitalize ${STATUS_STYLES[a.status] ?? "bg-zinc-500 text-white"}`}
              >
                {a.status}
              </span>
            </div>
            <dl className="mt-2 flex flex-col gap-1 text-sm">
              <div className="flex justify-between gap-2">
                <dt className="text-zinc-500">Address</dt>
                <dd className="truncate text-zinc-700">{a.propertyAddress}</dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt className="text-zinc-500">Customer</dt>
                <dd className="truncate text-zinc-700">
                  {a.customer?.name ?? a.customerName ?? "—"}
                </dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt className="text-zinc-500">Price</dt>
                <dd className="font-medium text-zinc-900">${a.quotedPrice.toFixed(2)}</dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt className="text-zinc-500">Created</dt>
                <dd className="text-zinc-700">{formatDate(a.createdAt)}</dd>
              </div>
            </dl>
          </Link>
        ))}
        {agreements.length === 0 && (
          <p className="rounded-2xl border border-dashed border-zinc-300 p-6 text-center text-zinc-400">
            No demolition agreements yet — create your first one above.
          </p>
        )}
      </div>

      {/* Tablet/desktop: table */}
      <div className="mt-6 hidden overflow-x-auto rounded-lg border-2 border-zinc-900 bg-white md:block">
        <table className="w-full text-left text-sm">
          <thead className="bg-zinc-50 text-zinc-500">
            <tr>
              <th className="px-5 py-3.5 font-semibold">Created</th>
              <th className="px-5 py-3.5 font-semibold">Structure</th>
              <th className="px-5 py-3.5 font-semibold">Address</th>
              <th className="px-5 py-3.5 font-semibold">Customer</th>
              <th className="px-5 py-3.5 font-semibold">Price</th>
              <th className="px-5 py-3.5 font-semibold">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {agreements.map((a) => (
              <tr key={a.id} className="hover:bg-zinc-50">
                <td className="px-5 py-4">
                  <Link
                    href={`/demolition-agreements/${a.id}`}
                    className="font-medium text-zinc-900 hover:underline"
                  >
                    {formatDate(a.createdAt)}
                  </Link>
                </td>
                <td className="px-5 py-4 text-zinc-600">{a.structureDescription}</td>
                <td className="px-5 py-4 text-zinc-600">{a.propertyAddress}</td>
                <td className="px-5 py-4 text-zinc-600">
                  {a.customer?.name ?? a.customerName ?? "—"}
                </td>
                <td className="px-5 py-4 text-zinc-600">${a.quotedPrice.toFixed(2)}</td>
                <td className="px-5 py-4">
                  <span
                    className={`inline-block rounded-full px-2 py-0.5 text-xs font-black capitalize ${STATUS_STYLES[a.status] ?? "bg-zinc-500 text-white"}`}
                  >
                    {a.status}
                  </span>
                </td>
              </tr>
            ))}
            {agreements.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-zinc-400">
                  No demolition agreements yet — create your first one above.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
