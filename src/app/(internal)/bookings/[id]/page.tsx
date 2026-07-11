import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import {
  markDelivered,
  markReturned,
  confirmBooking,
  declineBooking,
  deleteBooking,
  notifyOnTheWay,
  setBookingVehicle,
  resolveServiceRequest,
} from "../actions";
import { uploadPhoto, deletePhoto } from "../photoActions";
import { addDamageReport, deleteDamageReport } from "../damageActions";
import { setPermitRequired, updatePermit } from "../permitActions";
import { computeBookingStatus } from "@/lib/bookingStatus";
import { matchesPermitArea, PERMIT_STATUS_LABELS } from "@/lib/permits";
import { formatDate } from "@/lib/date";
import { Field, inputClass } from "@/components/Field";
import { LocationMap } from "@/components/LocationMap";
import { MediaUploadForm } from "@/components/MediaUploadForm";
import { MediaGrid } from "@/components/MediaGrid";
import { ConfirmButton } from "@/components/ConfirmButton";
import { CopyLinkButton } from "@/components/CopyLinkButton";
import { AddressLink } from "@/components/AddressLink";
import { VehicleQuickSelect } from "@/components/VehicleQuickSelect";
import { FacebookShareBox } from "@/components/FacebookShareBox";
import { branding } from "@/lib/branding";
import { requireUser } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function BookingDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ notified?: string }>;
}) {
  const { id } = await params;
  const { notified } = await searchParams;
  const user = await requireUser();
  const [booking, vehicles, permitAreas] = await Promise.all([
    db.booking.findFirst({
      where: { id, organizationId: user.effectiveOrganizationId },
      include: {
        customer: true,
        items: { include: { equipmentItem: { include: { category: true } } } },
        invoices: true,
        photos: { orderBy: { createdAt: "desc" } },
        damageReports: { orderBy: { createdAt: "desc" }, include: { equipmentItem: true } },
        serviceRequests: { where: { status: "pending" }, orderBy: { createdAt: "desc" } },
      },
    }),
    db.vehicle.findMany({
      where: { active: true, organizationId: user.effectiveOrganizationId },
      orderBy: { label: "asc" },
    }),
    db.permitArea.findMany({ where: { organizationId: user.effectiveOrganizationId } }),
  ]);

  if (!booking) notFound();

  const showPermitChecklist =
    booking.permitRequired || matchesPermitArea(booking.deliveryAddress, permitAreas);
  const setPermitRequiredWithId = setPermitRequired.bind(null, booking.id);
  const updatePermitWithId = updatePermit.bind(null, booking.id);

  const isPending = booking.status === "pending";
  const isCancelled = booking.status === "cancelled";
  const status = isPending
    ? "Pending Review"
    : isCancelled
      ? "Cancelled"
      : computeBookingStatus(booking.items);
  const total = booking.items.reduce((sum, item) => sum + item.price, 0);
  const confirmWithId = confirmBooking.bind(null, booking.id);
  const declineWithId = declineBooking.bind(null, booking.id);
  const deleteWithId = deleteBooking.bind(null, booking.id);
  const notifyWithId = notifyOnTheWay.bind(null, booking.id);
  const canDelete = booking.invoices.length === 0;

  // Deliberately generic — no customer name or exact address, since this
  // is meant to be posted publicly.
  const categoryNames = Array.from(
    new Set(booking.items.map((item) => item.equipmentItem.category.name))
  );
  const facebookCaption = [
    `Job complete! 🚛 We just wrapped up a ${categoryNames.join(" + ")} job in the ${branding.address} area.`,
    "",
    `Need a dumpster, junk removal, or demo work done? ${branding.phone ? `Call or text us at ${branding.phone}` : "Reach out to us"} to get a quote.`,
    "",
    "#MobiDumpsters #DumpsterRental #JunkRemoval #ByronGA #MaconGA",
  ].join("\n");
  const addDamageReportWithId = addDamageReport.bind(null, booking.id);

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-ink">
            Booking for{" "}
            <Link
              href={`/customers/${booking.customer.id}`}
              className="hover:underline"
            >
              {booking.customer.name}
            </Link>
          </h1>
          <p className="mt-1 text-zinc-500">
            {status} · <AddressLink address={booking.deliveryAddress} />
          </p>
          {booking.googleCalendarEventId && (
            <p className="mt-1 text-xs text-zinc-400">
              Synced to Google Calendar
            </p>
          )}
          {vehicles.length > 0 && (
            <div className="mt-2">
              <VehicleQuickSelect
                bookingId={booking.id}
                currentVehicleId={booking.vehicleId}
                vehicles={vehicles}
                action={setBookingVehicle}
              />
            </div>
          )}
        </div>
        <div className="flex flex-wrap gap-3">
          {!isPending && !isCancelled && (
            booking.customer.email ? (
              <form action={notifyWithId}>
                <button
                  type="submit"
                  className="rounded-xl border border-blue-300 bg-blue-50 px-5 py-3 text-sm font-semibold text-blue-700 transition-colors hover:bg-blue-100"
                >
                  🚚 On My Way
                </button>
              </form>
            ) : (
              <span
                title="Add an email to this customer's profile to send this."
                className="cursor-not-allowed rounded-xl border border-zinc-200 px-5 py-3 text-sm font-semibold text-zinc-400"
              >
                🚚 On My Way
              </span>
            )
          )}
          {!isPending && !isCancelled && (
            <CopyLinkButton
              path={`/booking/${booking.id}/manage`}
              label="Copy Rental Link"
              className="rounded-xl border border-zinc-300 px-5 py-3 text-sm font-semibold text-zinc-700 transition-colors hover:bg-zinc-50"
            />
          )}
          {!isPending &&
            (booking.invoices.length === 0 ? (
              <Link
                href={`/invoices/new?bookingId=${booking.id}`}
                className="rounded-xl bg-brand px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-brand-dark"
              >
                Create Invoice
              </Link>
            ) : (
              <Link
                href={`/invoices/${booking.invoices[0].id}`}
                className="rounded-xl border border-zinc-300 px-5 py-3 text-sm font-semibold text-zinc-700 transition-colors hover:bg-zinc-50"
              >
                View Invoice
              </Link>
            ))}
          <Link
            href={`/bookings/${booking.id}/edit`}
            className="rounded-xl border border-zinc-300 px-5 py-3 text-sm font-semibold text-zinc-700 transition-colors hover:bg-zinc-50"
          >
            Edit
          </Link>
          {canDelete ? (
            <form action={deleteWithId}>
              <ConfirmButton
                message="Delete this booking? This can't be undone."
                className="rounded-xl border border-red-200 px-5 py-3 text-sm font-semibold text-red-600 transition-colors hover:bg-red-50"
              >
                Delete
              </ConfirmButton>
            </form>
          ) : (
            <span
              title="Delete the invoice first to delete this booking."
              className="cursor-not-allowed rounded-xl border border-zinc-200 px-5 py-3 text-sm font-semibold text-zinc-400"
            >
              Delete
            </span>
          )}
        </div>
      </div>

      {notified === "1" && (
        <p className="mt-4 rounded-xl bg-green-50 px-4 py-3 text-sm font-medium text-green-700">
          Customer notified — email sent to {booking.customer.email}.
        </p>
      )}
      {notified === "no-email" && (
        <p className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
          This customer has no email on file — add one to their profile first.
        </p>
      )}
      {notified === "error" && (
        <p className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
          Couldn&apos;t send the email — check that Resend is fully set up (a
          new domain can take a few hours to verify) and try again.
        </p>
      )}

      {booking.notes && (
        <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-amber-700">
            Note
          </p>
          <p className="mt-1 text-sm text-zinc-700">{booking.notes}</p>
        </div>
      )}

      {showPermitChecklist ? (
        <div className="mt-4 rounded-xl border border-blue-200 bg-blue-50 p-4">
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-blue-700">
              Permit for Street Placement
            </p>
            <form action={setPermitRequiredWithId.bind(null, false)}>
              <button type="submit" className="text-xs text-zinc-500 hover:underline">
                Not needed after all
              </button>
            </form>
          </div>
          <form
            action={updatePermitWithId}
            className="mt-2 flex flex-wrap items-end gap-3"
          >
            <Field label="Permit Number" htmlFor="permitNumber">
              <input
                id="permitNumber"
                name="permitNumber"
                defaultValue={booking.permitNumber ?? ""}
                className={`${inputClass} py-2`}
                placeholder="optional"
              />
            </Field>
            <Field label="Status" htmlFor="permitStatus">
              <select
                id="permitStatus"
                name="permitStatus"
                defaultValue={booking.permitStatus ?? ""}
                className={`${inputClass} py-2`}
              >
                <option value="">Not requested yet</option>
                {Object.entries(PERMIT_STATUS_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </Field>
            <button
              type="submit"
              className="rounded-lg border border-blue-300 bg-white px-3 py-2 text-xs font-semibold text-blue-700 transition-colors hover:bg-blue-100"
            >
              Save
            </button>
          </form>
        </div>
      ) : (
        <form action={setPermitRequiredWithId.bind(null, true)} className="mt-3">
          <button type="submit" className="text-xs text-zinc-400 hover:text-zinc-600 hover:underline">
            + This delivery requires a permit
          </button>
        </form>
      )}

      {booking.serviceRequests.length > 0 && (
        <div className="mt-4 flex flex-col gap-2">
          {booking.serviceRequests.map((req) => (
            <div
              key={req.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4"
            >
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-amber-700">
                  {req.type === "extension" ? "Extension Requested" : "Dump & Return Requested"}
                </p>
                {req.details && <p className="mt-1 text-sm text-zinc-700">{req.details}</p>}
              </div>
              <form action={resolveServiceRequest.bind(null, req.id)}>
                <button
                  type="submit"
                  className="rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-xs font-semibold text-zinc-700 transition-colors hover:bg-zinc-50"
                >
                  Mark Handled
                </button>
              </form>
            </div>
          ))}
        </div>
      )}

      {isPending && (
        <form
          action={confirmWithId}
          className="mt-6 flex flex-col gap-4 rounded-2xl border-2 border-amber-300 bg-amber-50 p-5 shadow-sm"
        >
          <div>
            <h2 className="text-lg font-semibold text-ink">
              New Request — Awaiting Review
            </h2>
            <p className="mt-1 text-sm text-zinc-600">
              Set a price for each item, then confirm to reserve the
              equipment and add this to your schedule. Contact the customer
              about payment before or after confirming.
            </p>
          </div>
          <div className="flex flex-col gap-3">
            {booking.items.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between gap-3 rounded-xl bg-white p-3"
              >
                <div>
                  <p className="font-medium text-zinc-900">
                    {item.equipmentItem.label}
                  </p>
                  <p className="text-sm text-zinc-500">
                    {formatDate(item.startDate)} –{" "}
                    {formatDate(item.expectedReturnDate)}
                  </p>
                </div>
                <input
                  type="number"
                  step="0.01"
                  name={`price_${item.id}`}
                  defaultValue={item.price || ""}
                  placeholder="Price"
                  className={`${inputClass} w-32`}
                />
              </div>
            ))}
          </div>
          <div className="flex gap-3">
            <button
              type="submit"
              className="rounded-xl bg-brand px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-brand-dark"
            >
              Confirm Booking
            </button>
            <button
              type="submit"
              formAction={declineWithId}
              className="rounded-xl border border-zinc-300 bg-white px-5 py-3 text-sm font-semibold text-red-600 transition-colors hover:bg-red-50"
            >
              Decline
            </button>
          </div>
        </form>
      )}

      {booking.latitude !== null && booking.longitude !== null && (
        <div className="mt-6">
          <LocationMap
            pins={[
              {
                id: booking.id,
                lat: booking.latitude,
                lng: booking.longitude,
                label: booking.deliveryAddress,
                href: `/bookings/${booking.id}`,
              },
            ]}
            heightClassName="h-64"
            zoom={15}
          />
        </div>
      )}

      {/* Mobile: card list */}
      <div className="mt-6 flex flex-col gap-3 md:hidden">
        {booking.items.map((item) => (
          <div
            key={item.id}
            className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm"
          >
            <p className="font-medium text-zinc-900">
              {item.equipmentItem.label}
            </p>
            <dl className="mt-2 flex flex-col gap-1 text-sm">
              <div className="flex justify-between gap-2">
                <dt className="text-zinc-500">Start</dt>
                <dd className="text-zinc-700">{formatDate(item.startDate)}</dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt className="text-zinc-500">Expected Return</dt>
                <dd className="text-zinc-700">
                  {formatDate(item.expectedReturnDate)}
                </dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt className="text-zinc-500">Price</dt>
                <dd className="text-zinc-700">${item.price.toFixed(2)}</dd>
              </div>
            </dl>
            <div className="mt-3 flex flex-col gap-3 border-t border-zinc-100 pt-3">
              <div>
                <p className="text-xs text-zinc-500">Delivery</p>
                {item.deliveredAt ? (
                  <span className="text-sm text-zinc-500">
                    {item.deliveredAt.toLocaleDateString()}
                  </span>
                ) : (
                  <form action={markDelivered.bind(null, item.id)}>
                    <button
                      type="submit"
                      className="text-sm font-semibold text-brand hover:underline"
                    >
                      Mark Delivered
                    </button>
                  </form>
                )}
              </div>
              <div>
                <p className="text-xs text-zinc-500">Return</p>
                {item.actualReturnDate ? (
                  <span className="text-sm text-zinc-500">
                    {item.actualReturnDate.toLocaleDateString()}
                  </span>
                ) : (
                  <form
                    action={markReturned.bind(null, item.id)}
                    className="flex flex-col gap-1.5"
                  >
                    <input
                      type="number"
                      step="0.01"
                      name="actualTonnage"
                      placeholder="Tons (optional)"
                      className={`${inputClass} px-2.5 py-1.5 text-xs`}
                    />
                    <input
                      type="number"
                      step="0.1"
                      name="actualMileage"
                      placeholder="Miles (optional)"
                      className={`${inputClass} px-2.5 py-1.5 text-xs`}
                    />
                    <button
                      type="submit"
                      className="self-start text-sm font-semibold text-brand hover:underline"
                    >
                      Mark Returned
                    </button>
                  </form>
                )}
              </div>
            </div>
          </div>
        ))}
        <div className="flex items-center justify-between rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
          <span className="font-medium text-zinc-500">Total</span>
          <span className="font-medium text-zinc-900">${total.toFixed(2)}</span>
        </div>
      </div>

      {/* Tablet/desktop: table */}
      <div className="mt-6 hidden overflow-x-auto rounded-2xl border border-zinc-200 bg-white shadow-sm md:block">
        <table className="w-full text-left text-sm">
          <thead className="bg-zinc-50 text-zinc-500">
            <tr>
              <th className="px-5 py-3.5 font-semibold">Item</th>
              <th className="px-5 py-3.5 font-semibold">Start</th>
              <th className="px-5 py-3.5 font-semibold">Expected Return</th>
              <th className="px-5 py-3.5 font-semibold">Price</th>
              <th className="px-5 py-3.5 font-semibold">Delivery</th>
              <th className="px-5 py-3.5 font-semibold">Return</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {booking.items.map((item) => (
              <tr key={item.id}>
                <td className="px-5 py-4 font-medium text-zinc-900">
                  {item.equipmentItem.label}
                </td>
                <td className="px-5 py-4 text-zinc-600">
                  {formatDate(item.startDate)}
                </td>
                <td className="px-5 py-4 text-zinc-600">
                  {formatDate(item.expectedReturnDate)}
                </td>
                <td className="px-5 py-4 text-zinc-600">
                  ${item.price.toFixed(2)}
                </td>
                <td className="px-5 py-4">
                  {item.deliveredAt ? (
                    <span className="text-zinc-500">
                      {item.deliveredAt.toLocaleDateString()}
                    </span>
                  ) : (
                    <form action={markDelivered.bind(null, item.id)}>
                      <button
                        type="submit"
                        className="text-sm font-semibold text-brand hover:underline"
                      >
                        Mark Delivered
                      </button>
                    </form>
                  )}
                </td>
                <td className="px-5 py-4">
                  {item.actualReturnDate ? (
                    <span className="text-zinc-500">
                      {item.actualReturnDate.toLocaleDateString()}
                    </span>
                  ) : (
                    <form
                      action={markReturned.bind(null, item.id)}
                      className="flex flex-col gap-1.5"
                    >
                      <input
                        type="number"
                        step="0.01"
                        name="actualTonnage"
                        placeholder="Tons (optional)"
                        className={`${inputClass} w-36 px-2.5 py-1.5 text-xs`}
                      />
                      <input
                        type="number"
                        step="0.1"
                        name="actualMileage"
                        placeholder="Miles (optional)"
                        className={`${inputClass} w-36 px-2.5 py-1.5 text-xs`}
                      />
                      <button
                        type="submit"
                        className="text-sm font-semibold text-brand hover:underline"
                      >
                        Mark Returned
                      </button>
                    </form>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <td colSpan={3} className="px-5 py-4 text-right font-medium text-zinc-500">
                Total
              </td>
              <td colSpan={3} className="px-5 py-4 font-medium text-zinc-900">
                ${total.toFixed(2)}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      <h2 className="mt-8 text-xl font-semibold text-ink">Damage Reports</h2>
      <p className="mt-1 text-sm text-zinc-500">
        File a report if equipment came back damaged — bill the estimated
        cost to the customer&apos;s invoice, or record it as a repair
        expense the business absorbs. Attach photos below under
        &quot;Damage&quot;.
      </p>
      <form
        action={addDamageReportWithId}
        className="mt-3 flex flex-col gap-4 rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm"
      >
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Equipment" htmlFor="equipmentItemId">
            <select id="equipmentItemId" name="equipmentItemId" required className={inputClass}>
              {booking.items.map((item) => (
                <option key={item.equipmentItemId} value={item.equipmentItemId}>
                  {item.equipmentItem.label}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Estimated Repair Cost" htmlFor="estimatedCost">
            <input
              id="estimatedCost"
              name="estimatedCost"
              type="number"
              step="0.01"
              min="0"
              required
              className={inputClass}
            />
          </Field>
        </div>
        <Field label="Description" htmlFor="description">
          <input id="description" name="description" required className={inputClass} />
        </Field>
        <label className="flex items-center gap-2 text-sm font-medium text-zinc-700">
          <input
            type="checkbox"
            name="billedToCustomer"
            className="h-4 w-4 rounded border-zinc-300"
          />
          Bill this to the customer&apos;s invoice (leave unchecked to record it as a repair expense instead)
        </label>
        <div>
          <button
            type="submit"
            className="rounded-xl bg-brand px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-brand-dark"
          >
            File Damage Report
          </button>
        </div>
      </form>

      <div className="mt-3 flex flex-col gap-3">
        {booking.damageReports.map((report) => (
          <div
            key={report.id}
            className="flex items-center justify-between gap-3 rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm"
          >
            <div>
              <p className="font-medium text-zinc-900">
                {report.equipmentItem.label} — ${report.estimatedCost.toFixed(2)}
              </p>
              <p className="text-sm text-zinc-500">{report.description}</p>
              <span
                className={`mt-1 inline-block rounded-full px-2 py-0.5 text-xs font-medium ${
                  report.billedToCustomer
                    ? "bg-amber-100 text-amber-700"
                    : "bg-zinc-100 text-zinc-600"
                }`}
              >
                {report.billedToCustomer ? "Billed to customer" : "Business expense"}
              </span>
            </div>
            <form action={deleteDamageReport.bind(null, report.id)}>
              <ConfirmButton
                message="Delete this damage report? This will also remove the associated invoice charge or expense."
                className="text-sm font-semibold text-red-600 hover:underline"
              >
                Delete
              </ConfirmButton>
            </form>
          </div>
        ))}
        {booking.damageReports.length === 0 && (
          <p className="text-sm text-zinc-400">No damage reported.</p>
        )}
      </div>

      <h2 className="mt-8 text-xl font-semibold text-ink">Photos & Videos</h2>
      <MediaUploadForm
        uploadAction={uploadPhoto.bind(null, booking.id)}
        typeOptions={[
          { value: "delivery", label: "Delivery" },
          { value: "pickup", label: "Pickup" },
          { value: "damage", label: "Damage" },
          { value: "other", label: "Other" },
        ]}
        defaultType="delivery"
        folder={`bookings/${booking.id}`}
      />

      <MediaGrid items={booking.photos} deleteAction={deletePhoto} />

      {booking.photos.some((p) => p.mediaType !== "video") && (
        <div className="mt-6">
          <FacebookShareBox
            photos={booking.photos
              .filter((p) => p.mediaType !== "video")
              .map((p) => ({ src: p.filePath, alt: p.caption ?? p.type }))}
            defaultCaption={facebookCaption}
            facebookPageUrl={branding.facebookPageUrl ?? null}
          />
        </div>
      )}
    </div>
  );
}
