import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { parseTags } from "@/lib/tags";
import { addCustomerNote } from "../actions";
import { uploadCustomerPhoto, deleteCustomerPhoto } from "../photoActions";
import { Field, inputClass } from "@/components/Field";
import { AddressLink } from "@/components/AddressLink";
import { GalleryImage } from "@/components/GalleryImage";

export const dynamic = "force-dynamic";

export default async function CustomerDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const customer = await db.customer.findUnique({
    where: { id },
    include: {
      bookings: {
        orderBy: { createdAt: "desc" },
        include: {
          items: { include: { equipmentItem: true } },
          invoices: true,
        },
      },
      communications: { orderBy: { createdAt: "desc" } },
      invoices: { orderBy: { issueDate: "desc" } },
      photos: { orderBy: { createdAt: "desc" } },
      signedAgreements: { orderBy: { agreedAt: "desc" } },
    },
  });

  if (!customer) notFound();

  // Standalone invoices (customerId set directly, no booking — e.g.
  // imported historical revenue) plus invoices reached via a real booking.
  const standaloneInvoices = customer.invoices.filter((i) => !i.bookingId);
  const allInvoices = [
    ...customer.bookings.flatMap((b) => b.invoices),
    ...standaloneInvoices,
  ];
  const lifetimeValue = allInvoices
    .filter((i) => i.status === "paid")
    .reduce((sum, i) => sum + i.amount, 0);
  const outstanding = allInvoices
    .filter((i) => i.status !== "paid")
    .reduce((sum, i) => sum + i.amount, 0);
  const tags = parseTags(customer.tags);

  const addNoteWithId = addCustomerNote.bind(null, customer.id);
  const uploadPhotoWithId = uploadCustomerPhoto.bind(null, customer.id);

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-ink">
            {customer.name}
          </h1>
          {customer.companyName && (
            <p className="text-zinc-500">{customer.companyName}</p>
          )}
          {tags.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {tags.map((tag) => (
                <span
                  key={tag}
                  className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-600"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>
        <Link
          href={`/customers/${customer.id}/edit`}
          className="rounded-xl border border-zinc-300 px-5 py-3 text-sm font-semibold text-zinc-700 transition-colors hover:bg-zinc-50"
        >
          Edit
        </Link>
      </div>

      <dl className="mt-6 grid grid-cols-2 gap-4 rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm text-sm sm:grid-cols-3">
        <div>
          <dt className="text-zinc-500">Phone</dt>
          <dd className="text-zinc-900">{customer.phone ?? "—"}</dd>
        </div>
        <div>
          <dt className="text-zinc-500">Email</dt>
          <dd className="text-zinc-900">{customer.email ?? "—"}</dd>
        </div>
        <div>
          <dt className="text-zinc-500">Address</dt>
          <dd className="text-zinc-900">
            {customer.address ? (
              <AddressLink
                address={customer.address}
                className="hover:underline text-brand-dark"
              />
            ) : (
              "—"
            )}
          </dd>
        </div>
        <div>
          <dt className="text-zinc-500">Lifetime Value (Paid)</dt>
          <dd className="font-medium text-green-700">
            ${lifetimeValue.toFixed(2)}
          </dd>
        </div>
        <div>
          <dt className="text-zinc-500">Outstanding</dt>
          <dd
            className={`font-medium ${outstanding > 0 ? "text-amber-600" : "text-zinc-900"}`}
          >
            ${outstanding.toFixed(2)}
          </dd>
        </div>
        {customer.notes && (
          <div className="col-span-full">
            <dt className="text-zinc-500">Notes</dt>
            <dd className="text-zinc-900">{customer.notes}</dd>
          </div>
        )}
      </dl>

      <h2 className="mt-8 text-xl font-semibold text-ink">
        Job History
      </h2>
      <div className="mt-3 overflow-x-auto rounded-2xl border border-zinc-200 bg-white shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="bg-zinc-50 text-zinc-500">
            <tr>
              <th className="px-5 py-3.5 font-semibold">Booking</th>
              <th className="px-5 py-3.5 font-semibold">Status</th>
              <th className="px-5 py-3.5 font-semibold">Items</th>
              <th className="px-5 py-3.5 font-semibold">Delivery Address</th>
              <th className="px-5 py-3.5 font-semibold">Invoices</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {customer.bookings.map((booking) => (
              <tr key={booking.id} className="hover:bg-zinc-50">
                <td className="px-5 py-4">
                  <Link
                    href={`/bookings/${booking.id}`}
                    className="font-medium text-zinc-900 hover:underline"
                  >
                    {new Date(booking.createdAt).toLocaleDateString()}
                  </Link>
                </td>
                <td className="px-5 py-4 capitalize text-zinc-600">
                  {booking.status.replace("_", " ")}
                </td>
                <td className="px-5 py-4 text-zinc-600">
                  {booking.items
                    .map((item) => item.equipmentItem.label)
                    .join(", ")}
                </td>
                <td className="px-5 py-4 text-zinc-600">
                  {booking.deliveryAddress}
                </td>
                <td className="px-5 py-4 text-zinc-600">
                  {booking.invoices.length === 0
                    ? "—"
                    : booking.invoices.map((inv) => inv.status).join(", ")}
                </td>
              </tr>
            ))}
            {customer.bookings.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-zinc-400">
                  No bookings yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {standaloneInvoices.length > 0 && (
        <>
          <h2 className="mt-8 text-xl font-semibold text-ink">
            Other Invoices
          </h2>
          <p className="mt-1 text-sm text-zinc-500">
            Not tied to a booking in this app (e.g. imported historical
            records).
          </p>
          <div className="mt-3 overflow-x-auto rounded-2xl border border-zinc-200 bg-white shadow-sm">
            <table className="w-full text-left text-sm">
              <thead className="bg-zinc-50 text-zinc-500">
                <tr>
                  <th className="px-5 py-3.5 font-semibold">Invoice #</th>
                  <th className="px-5 py-3.5 font-semibold">Issue Date</th>
                  <th className="px-5 py-3.5 font-semibold">Amount</th>
                  <th className="px-5 py-3.5 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {standaloneInvoices.map((invoice) => (
                  <tr key={invoice.id} className="hover:bg-zinc-50">
                    <td className="px-5 py-4">
                      <Link
                        href={`/invoices/${invoice.id}`}
                        className="font-medium text-zinc-900 hover:underline"
                      >
                        {invoice.invoiceNumber}
                      </Link>
                    </td>
                    <td className="px-5 py-4 text-zinc-600">
                      {new Date(invoice.issueDate).toLocaleDateString(undefined, {
                        timeZone: "UTC",
                      })}
                    </td>
                    <td className="px-5 py-4 text-zinc-600">
                      ${invoice.amount.toFixed(2)}
                    </td>
                    <td className="px-5 py-4 capitalize text-zinc-600">
                      {invoice.status}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      <h2 className="mt-8 text-xl font-semibold text-ink">Photos</h2>
      <form
        action={uploadPhotoWithId}
        className="mt-3 flex flex-col gap-3 rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm"
      >
        <div className="flex gap-3">
          <Field label="Type" htmlFor="type">
            <select id="type" name="type" defaultValue="other" className={inputClass}>
              <option value="property">Property</option>
              <option value="id">ID / License</option>
              <option value="contract">Contract</option>
              <option value="other">Other</option>
            </select>
          </Field>
          <Field label="Caption (optional)" htmlFor="caption">
            <input id="caption" name="caption" className={inputClass} />
          </Field>
        </div>
        <Field label="Photo" htmlFor="file">
          <input
            id="file"
            name="file"
            type="file"
            accept="image/*"
            capture="environment"
            required
            className={inputClass}
          />
        </Field>
        <div>
          <button
            type="submit"
            className="rounded-xl bg-brand px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-brand-dark"
          >
            Upload Photo
          </button>
        </div>
      </form>

      <div className="mt-3 grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
        {customer.photos.map((photo, i) => (
          <div
            key={photo.id}
            className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm"
          >
            <GalleryImage
              images={customer.photos.map((p) => ({
                src: `/api/uploads/${p.filePath}`,
                alt: p.caption ?? p.type,
              }))}
              index={i}
              className="h-40 w-full object-cover"
            />
            <div className="p-2">
              <span className="inline-block rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-medium capitalize text-zinc-600">
                {photo.type}
              </span>
              {photo.caption && (
                <p className="mt-1 text-xs text-zinc-600">{photo.caption}</p>
              )}
              <form action={deleteCustomerPhoto.bind(null, photo.id)} className="mt-1">
                <button
                  type="submit"
                  className="text-xs text-red-600 hover:underline"
                >
                  Delete
                </button>
              </form>
            </div>
          </div>
        ))}
        {customer.photos.length === 0 && (
          <p className="col-span-full text-center text-zinc-400">
            No photos yet.
          </p>
        )}
      </div>

      {customer.signedAgreements.length > 0 && (
        <>
          <h2 className="mt-8 text-xl font-semibold text-ink">
            Signed Agreements
          </h2>
          <div className="mt-3 overflow-x-auto rounded-2xl border border-zinc-200 bg-white shadow-sm">
            <table className="w-full text-left text-sm">
              <thead className="bg-zinc-50 text-zinc-500">
                <tr>
                  <th className="px-5 py-3.5 font-semibold">Signed</th>
                  <th className="px-5 py-3.5 font-semibold">Agreement</th>
                  <th className="px-5 py-3.5 font-semibold">Signer Name</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {customer.signedAgreements.map((s) => (
                  <tr key={s.id} className="hover:bg-zinc-50">
                    <td className="px-5 py-4">
                      <Link
                        href={`/agreements/${s.id}`}
                        className="font-medium text-zinc-900 hover:underline"
                      >
                        {new Date(s.agreedAt).toLocaleDateString()}
                      </Link>
                    </td>
                    <td className="px-5 py-4 text-zinc-600">
                      {s.agreementTitle}
                    </td>
                    <td className="px-5 py-4 text-zinc-600">
                      {s.signerName}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      <h2 className="mt-8 text-xl font-semibold text-ink">
        Communication Log
      </h2>
      <form
        action={addNoteWithId}
        className="mt-3 flex flex-col gap-3 rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm"
      >
        <div className="flex gap-3">
          <Field label="Type" htmlFor="type">
            <select id="type" name="type" defaultValue="note" className={inputClass}>
              <option value="note">Note</option>
              <option value="call">Call</option>
              <option value="text">Text</option>
              <option value="email">Email</option>
            </select>
          </Field>
        </div>
        <Field label="What happened?" htmlFor="content">
          <textarea
            id="content"
            name="content"
            rows={2}
            required
            placeholder="e.g. Called to confirm delivery window"
            className={inputClass}
          />
        </Field>
        <div>
          <button
            type="submit"
            className="rounded-xl bg-brand px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-brand-dark"
          >
            Add Entry
          </button>
        </div>
      </form>

      <div className="mt-3 flex flex-col gap-2">
        {customer.communications.map((entry) => (
          <div
            key={entry.id}
            className="flex items-start gap-3 rounded-xl border border-zinc-200 bg-white p-3 shadow-sm text-sm"
          >
            <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-medium capitalize text-zinc-600">
              {entry.type}
            </span>
            <div className="flex-1">
              <p className="text-zinc-900">{entry.content}</p>
              <p className="mt-1 text-xs text-zinc-400">
                {entry.createdAt.toLocaleString()}
              </p>
            </div>
          </div>
        ))}
        {customer.communications.length === 0 && (
          <p className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm text-center text-zinc-400">
            No communication logged yet.
          </p>
        )}
      </div>
    </div>
  );
}
