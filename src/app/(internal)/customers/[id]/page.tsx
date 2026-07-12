import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { parseTags } from "@/lib/tags";
import { addCustomerNote } from "../actions";
import { uploadCustomerPhoto, deleteCustomerPhoto } from "../photoActions";
import {
  addDumpLogEntry,
  deleteDumpLogEntry,
  addCreditEntry,
  deleteCreditEntry,
} from "../dumpActions";
import { Field, inputClass } from "@/components/Field";
import { AddressLink } from "@/components/AddressLink";
import { MediaUploadForm } from "@/components/MediaUploadForm";
import { MediaGrid } from "@/components/MediaGrid";
import { ConfirmButton } from "@/components/ConfirmButton";
import { Tabs } from "@/components/Tabs";
import { formatDate } from "@/lib/date";
import { LEAD_SOURCE_LABELS } from "@/lib/leadSource";
import { requireUser } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function CustomerDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await requireUser();
  const customer = await db.customer.findFirst({
    where: { id, organizationId: user.effectiveOrganizationId },
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
      dumpLogEntries: { orderBy: { date: "desc" }, include: { booking: true } },
      creditEntries: { orderBy: { createdAt: "desc" } },
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
  const creditBalance = customer.creditEntries.reduce((sum, e) => sum + e.amount, 0);

  const addNoteWithId = addCustomerNote.bind(null, customer.id);
  const uploadPhotoWithId = uploadCustomerPhoto.bind(null, customer.id);
  const addDumpEntryWithId = addDumpLogEntry.bind(null, customer.id);
  const addCreditWithId = addCreditEntry.bind(null, customer.id);

  const jobsTab = (
    <>
      <div>
        <h2 className="text-xl font-black text-ink">Job History</h2>
        <div className="mt-3 overflow-x-auto rounded-lg border-2 border-zinc-900 bg-white">
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
                    <AddressLink address={booking.deliveryAddress} />
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
      </div>

      {standaloneInvoices.length > 0 && (
        <div>
          <h2 className="text-xl font-black text-ink">Other Invoices</h2>
          <p className="mt-1 text-sm text-zinc-500">
            Not tied to a booking in this app (e.g. imported historical
            records).
          </p>
          <div className="mt-3 overflow-x-auto rounded-lg border-2 border-zinc-900 bg-white">
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
        </div>
      )}
    </>
  );

  const dumpAndCreditTab = (
    <>
      <div>
        <h2 className="text-xl font-black text-ink">Dump Log</h2>
        <p className="mt-1 text-sm text-zinc-500">
          Weight and fee for each dump, since a rental can involve more than one.
        </p>
        <form
          action={addDumpEntryWithId}
          className="mt-3 flex flex-col gap-3 rounded-lg border-2 border-zinc-900 bg-white p-5"
        >
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field label="Date" htmlFor="date">
              <input
                id="date"
                name="date"
                type="date"
                required
                defaultValue={new Date().toISOString().slice(0, 10)}
                className={inputClass}
              />
            </Field>
            <Field label="Job (optional)" htmlFor="bookingId">
              <select id="bookingId" name="bookingId" defaultValue="" className={inputClass}>
                <option value="">— Not tied to a job —</option>
                {customer.bookings.map((b) => (
                  <option key={b.id} value={b.id}>
                    {new Date(b.createdAt).toLocaleDateString()} —{" "}
                    {b.items.map((i) => i.equipmentItem.label).join(", ")}
                  </option>
                ))}
              </select>
            </Field>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field label="Weight (tons)" htmlFor="weightTons">
              <input
                id="weightTons"
                name="weightTons"
                type="number"
                step="0.01"
                min="0"
                required
                className={inputClass}
              />
            </Field>
            <Field label="Fee ($)" htmlFor="fee">
              <input
                id="fee"
                name="fee"
                type="number"
                step="0.01"
                min="0"
                required
                className={inputClass}
              />
            </Field>
          </div>
          <Field label="Notes (optional)" htmlFor="notes">
            <input id="notes" name="notes" className={inputClass} />
          </Field>
          <div>
            <button
              type="submit"
              className="rounded-lg bg-brand px-5 py-3 text-sm font-bold text-white transition-colors hover:bg-brand-dark"
            >
              Add Dump
            </button>
          </div>
        </form>

        <div className="mt-3 flex flex-col gap-2">
          {customer.dumpLogEntries.map((entry) => (
            <div
              key={entry.id}
              className="flex items-start justify-between gap-3 rounded-xl border border-zinc-200 bg-white p-3 shadow-sm text-sm"
            >
              <div>
                <p className="text-zinc-900">
                  {formatDate(entry.date)} — {entry.weightTons.toFixed(2)} tons — $
                  {entry.fee.toFixed(2)}
                </p>
                {entry.booking && (
                  <Link
                    href={`/bookings/${entry.booking.id}`}
                    className="text-xs text-zinc-500 hover:underline"
                  >
                    View job
                  </Link>
                )}
                {entry.notes && <p className="mt-1 text-xs text-zinc-500">{entry.notes}</p>}
              </div>
              <form action={deleteDumpLogEntry.bind(null, customer.id, entry.id)}>
                <ConfirmButton
                  message="Delete this dump log entry?"
                  className="flex-shrink-0 text-xs text-red-600 hover:underline"
                >
                  Delete
                </ConfirmButton>
              </form>
            </div>
          ))}
          {customer.dumpLogEntries.length === 0 && (
            <p className="rounded-lg border-2 border-zinc-900 bg-white p-5 text-center text-zinc-400">
              No dumps logged yet.
            </p>
          )}
        </div>
      </div>

      <div>
        <h2 className="text-xl font-black text-ink">Credit Balance</h2>
        <p className="mt-1 text-sm text-zinc-500">
          Current balance:{" "}
          <span className={creditBalance > 0 ? "font-semibold text-green-700" : "font-semibold text-zinc-700"}>
            ${creditBalance.toFixed(2)}
          </span>{" "}
          — applies toward this customer&apos;s next rental.
        </p>
        <form
          action={addCreditWithId}
          className="mt-3 flex flex-col gap-3 rounded-lg border-2 border-zinc-900 bg-white p-5"
        >
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field label="Amount ($, negative to use credit)" htmlFor="amount">
              <input id="amount" name="amount" type="number" step="0.01" required className={inputClass} />
            </Field>
            <Field label="Reason" htmlFor="reason">
              <input
                id="reason"
                name="reason"
                placeholder="e.g. Overpayment on invoice #123"
                required
                className={inputClass}
              />
            </Field>
          </div>
          <div>
            <button
              type="submit"
              className="rounded-lg bg-brand px-5 py-3 text-sm font-bold text-white transition-colors hover:bg-brand-dark"
            >
              Add Adjustment
            </button>
          </div>
        </form>

        <div className="mt-3 flex flex-col gap-2">
          {customer.creditEntries.map((entry) => (
            <div
              key={entry.id}
              className="flex items-start justify-between gap-3 rounded-xl border border-zinc-200 bg-white p-3 shadow-sm text-sm"
            >
              <div>
                <p className={entry.amount >= 0 ? "text-green-700" : "text-red-600"}>
                  {entry.amount >= 0 ? "+" : ""}
                  {entry.amount.toFixed(2)}
                </p>
                <p className="text-zinc-700">{entry.reason}</p>
                <p className="mt-1 text-xs text-zinc-400">
                  {entry.createdAt.toLocaleString()}
                </p>
              </div>
              <form action={deleteCreditEntry.bind(null, customer.id, entry.id)}>
                <ConfirmButton
                  message="Delete this credit adjustment?"
                  className="flex-shrink-0 text-xs text-red-600 hover:underline"
                >
                  Delete
                </ConfirmButton>
              </form>
            </div>
          ))}
          {customer.creditEntries.length === 0 && (
            <p className="rounded-lg border-2 border-zinc-900 bg-white p-5 text-center text-zinc-400">
              No credit adjustments yet.
            </p>
          )}
        </div>
      </div>
    </>
  );

  const mediaTab = (
    <>
      <div>
        <h2 className="text-xl font-black text-ink">Photos & Videos</h2>
        <div className="mt-3">
          <MediaUploadForm
            uploadAction={uploadPhotoWithId}
            typeOptions={[
              { value: "property", label: "Property" },
              { value: "id", label: "ID / License" },
              { value: "contract", label: "Contract" },
              { value: "other", label: "Other" },
            ]}
            defaultType="other"
            folder={`customers/${customer.id}`}
          />
          <MediaGrid items={customer.photos} deleteAction={deleteCustomerPhoto} />
        </div>
      </div>

      {customer.signedAgreements.length > 0 && (
        <div>
          <h2 className="text-xl font-black text-ink">Signed Agreements</h2>
          <div className="mt-3 overflow-x-auto rounded-lg border-2 border-zinc-900 bg-white">
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
        </div>
      )}
    </>
  );

  const notesTab = (
    <>
      <form
        action={addNoteWithId}
        className="flex flex-col gap-3 rounded-lg border-2 border-zinc-900 bg-white p-5"
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
            className="rounded-lg bg-brand px-5 py-3 text-sm font-bold text-white transition-colors hover:bg-brand-dark"
          >
            Add Entry
          </button>
        </div>
      </form>

      <div className="flex flex-col gap-2">
        {customer.communications.map((entry) => (
          <div
            key={entry.id}
            className="flex items-start gap-3 rounded-xl border border-zinc-200 bg-white p-3 shadow-sm text-sm"
          >
            <span className="rounded-full bg-zinc-500 px-2 py-0.5 text-xs font-black capitalize text-white">
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
          <p className="rounded-lg border-2 border-zinc-900 bg-white p-5 text-center text-zinc-400">
            No communication logged yet.
          </p>
        )}
      </div>
    </>
  );

  const tabs = [
    { id: "jobs", label: "Jobs & Billing", content: jobsTab },
    { id: "dump", label: "Dump Log & Credit", content: dumpAndCreditTab },
    { id: "media", label: "Photos & Documents", content: mediaTab },
    { id: "notes", label: "Communication Log", content: notesTab },
  ];

  return (
    <div>
      <Link href="/customers" className="text-sm font-semibold text-brand hover:underline">
        ← Back to Customers
      </Link>
      <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-ink">
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
                  className="rounded-full border-2 border-zinc-300 bg-white px-2 py-0.5 text-xs font-bold text-zinc-700"
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

      <dl className="mt-6 grid grid-cols-2 gap-4 rounded-lg border-2 border-zinc-900 bg-white p-5 text-sm sm:grid-cols-3">
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
        <div>
          <dt className="text-zinc-500">Credit Balance</dt>
          <dd
            className={`font-medium ${creditBalance > 0 ? "text-green-700" : "text-zinc-900"}`}
          >
            ${creditBalance.toFixed(2)}
          </dd>
        </div>
        <div>
          <dt className="text-zinc-500">Found Us Via</dt>
          <dd className="text-zinc-900">
            {customer.leadSource ? LEAD_SOURCE_LABELS[customer.leadSource] ?? customer.leadSource : "Not specified"}
          </dd>
        </div>
        {customer.notes && (
          <div className="col-span-full">
            <dt className="text-zinc-500">Notes</dt>
            <dd className="text-zinc-900">{customer.notes}</dd>
          </div>
        )}
      </dl>

      <div className="mt-6">
        <Tabs tabs={tabs} initialTab="jobs" />
      </div>
    </div>
  );
}
