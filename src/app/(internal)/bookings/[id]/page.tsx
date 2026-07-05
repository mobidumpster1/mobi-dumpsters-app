import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { markDelivered, markReturned, confirmBooking, declineBooking } from "../actions";
import { uploadPhoto, deletePhoto } from "../photoActions";
import { computeBookingStatus } from "@/lib/bookingStatus";
import { formatDate } from "@/lib/date";
import { Field, inputClass } from "@/components/Field";
import { LocationMap } from "@/components/LocationMap";
import { GalleryImage } from "@/components/GalleryImage";

export const dynamic = "force-dynamic";

export default async function BookingDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const booking = await db.booking.findUnique({
    where: { id },
    include: {
      customer: true,
      items: { include: { equipmentItem: true } },
      invoices: true,
      photos: { orderBy: { createdAt: "desc" } },
    },
  });

  if (!booking) notFound();

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
            {status} · {booking.deliveryAddress}
          </p>
          {booking.googleCalendarEventId && (
            <p className="mt-1 text-xs text-zinc-400">
              Synced to Google Calendar
            </p>
          )}
        </div>
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
      </div>

      {booking.notes && (
        <p className="mt-4 text-sm text-zinc-600">{booking.notes}</p>
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

      <div className="mt-6 overflow-x-auto rounded-2xl border border-zinc-200 bg-white shadow-sm">
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

      <h2 className="mt-8 text-xl font-semibold text-ink">Photos</h2>
      <form
        action={uploadPhoto.bind(null, booking.id)}
        className="mt-3 flex flex-col gap-3 rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm"
      >
        <div className="flex gap-3">
          <Field label="Type" htmlFor="type">
            <select id="type" name="type" defaultValue="delivery" className={inputClass}>
              <option value="delivery">Delivery</option>
              <option value="pickup">Pickup</option>
              <option value="damage">Damage</option>
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
        {booking.photos.map((photo, i) => (
          <div
            key={photo.id}
            className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm"
          >
            <GalleryImage
              images={booking.photos.map((p) => ({
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
              <form action={deletePhoto.bind(null, photo.id)} className="mt-1">
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
        {booking.photos.length === 0 && (
          <p className="col-span-full text-center text-zinc-400">
            No photos yet.
          </p>
        )}
      </div>
    </div>
  );
}
