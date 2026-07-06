import Link from "next/link";
import { db } from "@/lib/db";
import { SelectableCustomerMap } from "@/components/SelectableCustomerMap";
import { AddressLink } from "@/components/AddressLink";
import { SearchBox } from "@/components/SearchBox";

export const dynamic = "force-dynamic";

export default async function CustomersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;

  const customers = await db.customer.findMany({
    where: q
      ? {
          OR: [
            { name: { contains: q, mode: "insensitive" } },
            { companyName: { contains: q, mode: "insensitive" } },
            { phone: { contains: q, mode: "insensitive" } },
            { email: { contains: q, mode: "insensitive" } },
          ],
        }
      : undefined,
    orderBy: { name: "asc" },
    include: { bookings: true },
  });

  const mappableCustomers = customers
    .filter((c) => c.latitude !== null && c.longitude !== null)
    .map((c) => ({
      id: c.id,
      name: c.name,
      lat: c.latitude as number,
      lng: c.longitude as number,
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
        <SearchBox placeholder="Search customers by name, company, phone, or email…" />
      </div>

      <div className="mt-6">
        <SelectableCustomerMap customers={mappableCustomers} />
      </div>

      {/* Mobile: card list */}
      <div className="mt-6 flex flex-col gap-3 md:hidden">
        {customers.map((customer) => (
          <div
            key={customer.id}
            className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm"
          >
            <Link
              href={`/customers/${customer.id}`}
              className="font-medium text-zinc-900 hover:underline"
            >
              {customer.name}
            </Link>
            {customer.companyName && (
              <div className="text-xs text-zinc-500">{customer.companyName}</div>
            )}
            <dl className="mt-2 flex flex-col gap-1 text-sm">
              <div className="flex justify-between gap-2">
                <dt className="text-zinc-500">Phone</dt>
                <dd className="text-zinc-700">{customer.phone ?? "—"}</dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt className="text-zinc-500">Email</dt>
                <dd className="truncate text-zinc-700">{customer.email ?? "—"}</dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt className="flex-shrink-0 text-zinc-500">Address</dt>
                <dd className="truncate text-right text-zinc-700">
                  {customer.address ? (
                    <AddressLink address={customer.address} />
                  ) : (
                    "—"
                  )}
                </dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt className="text-zinc-500">Bookings</dt>
                <dd className="text-zinc-700">{customer.bookings.length}</dd>
              </div>
            </dl>
          </div>
        ))}
        {customers.length === 0 && (
          <p className="rounded-2xl border border-dashed border-zinc-300 p-6 text-center text-zinc-400">
            {q ? "No customers match your search." : "No customers yet."}
          </p>
        )}
      </div>

      {/* Tablet/desktop: table */}
      <div className="mt-6 hidden overflow-x-auto rounded-2xl border border-zinc-200 bg-white shadow-sm md:block">
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
                  {q ? "No customers match your search." : "No customers yet."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
