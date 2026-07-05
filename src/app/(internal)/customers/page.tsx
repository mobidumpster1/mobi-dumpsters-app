import Link from "next/link";
import { db } from "@/lib/db";
import { LocationMap } from "@/components/LocationMap";
import { AddressLink } from "@/components/AddressLink";

export const dynamic = "force-dynamic";

export default async function CustomersPage() {
  const customers = await db.customer.findMany({
    orderBy: { name: "asc" },
    include: { bookings: true },
  });

  const pins = customers
    .filter((c) => c.latitude !== null && c.longitude !== null)
    .map((c) => ({
      id: c.id,
      lat: c.latitude as number,
      lng: c.longitude as number,
      label: c.name,
      href: `/customers/${c.id}`,
    }));

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-3xl font-bold tracking-tight text-ink">Customers</h1>
        <Link
          href="/customers/new"
          className="rounded-xl bg-brand px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-brand-dark"
        >
          + New Customer
        </Link>
      </div>

      <div className="mt-6">
        <LocationMap pins={pins} />
      </div>

      <div className="mt-6 overflow-x-auto rounded-2xl border border-zinc-200 bg-white shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="bg-zinc-50 text-zinc-500">
            <tr>
              <th className="px-5 py-3.5 font-semibold">Name</th>
              <th className="px-5 py-3.5 font-semibold">Phone</th>
              <th className="px-5 py-3.5 font-semibold">Email</th>
              <th className="px-5 py-3.5 font-semibold">Address</th>
              <th className="px-5 py-3.5 font-semibold">Bookings</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {customers.map((customer) => (
              <tr key={customer.id} className="hover:bg-zinc-50">
                <td className="px-5 py-4">
                  <Link
                    href={`/customers/${customer.id}`}
                    className="font-medium text-zinc-900 hover:underline"
                  >
                    {customer.name}
                  </Link>
                  {customer.companyName && (
                    <div className="text-xs text-zinc-500">
                      {customer.companyName}
                    </div>
                  )}
                </td>
                <td className="px-5 py-4 text-zinc-600">
                  {customer.phone ?? "—"}
                </td>
                <td className="px-5 py-4 text-zinc-600">
                  {customer.email ?? "—"}
                </td>
                <td className="px-5 py-4 text-zinc-600">
                  {customer.address ? (
                    <AddressLink address={customer.address} />
                  ) : (
                    "—"
                  )}
                </td>
                <td className="px-5 py-4 text-zinc-600">
                  {customer.bookings.length}
                </td>
              </tr>
            ))}
            {customers.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-zinc-400">
                  No customers yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
