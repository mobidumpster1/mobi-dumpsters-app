import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { updateBooking } from "../../actions";
import { Field, inputClass } from "@/components/Field";

export const dynamic = "force-dynamic";

function dateInputValue(date: Date) {
  return date.toISOString().slice(0, 10);
}

export default async function EditBookingPage({
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
    },
  });

  if (!booking) notFound();

  const updateWithId = updateBooking.bind(null, booking.id);

  return (
    <div className="max-w-2xl">
      <h1 className="text-3xl font-black tracking-tight text-ink">
        Edit Booking for {booking.customer.name}
      </h1>
      <form action={updateWithId} className="mt-6 flex flex-col gap-4">
        <Field label="Delivery Address" htmlFor="deliveryAddress">
          <input
            id="deliveryAddress"
            name="deliveryAddress"
            defaultValue={booking.deliveryAddress}
            required
            className={inputClass}
          />
        </Field>

        <div className="flex flex-col gap-3">
          {booking.items.map((item) => (
            <div
              key={item.id}
              className="flex flex-col gap-3 rounded-lg border-2 border-zinc-900 bg-white p-4"
            >
              <p className="font-medium text-zinc-900">
                {item.equipmentItem.label}
              </p>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <Field label="Start" htmlFor={`startDate_${item.id}`}>
                  <input
                    id={`startDate_${item.id}`}
                    name={`startDate_${item.id}`}
                    type="date"
                    defaultValue={dateInputValue(item.startDate)}
                    className={inputClass}
                  />
                </Field>
                <Field
                  label="Expected Return"
                  htmlFor={`expectedReturnDate_${item.id}`}
                >
                  <input
                    id={`expectedReturnDate_${item.id}`}
                    name={`expectedReturnDate_${item.id}`}
                    type="date"
                    defaultValue={dateInputValue(item.expectedReturnDate)}
                    className={inputClass}
                  />
                </Field>
                <Field label="Price" htmlFor={`price_${item.id}`}>
                  <input
                    id={`price_${item.id}`}
                    name={`price_${item.id}`}
                    type="number"
                    step="0.01"
                    defaultValue={item.price}
                    className={inputClass}
                  />
                </Field>
              </div>
            </div>
          ))}
        </div>

        <Field label="Notes" htmlFor="notes">
          <textarea
            id="notes"
            name="notes"
            rows={3}
            defaultValue={booking.notes ?? ""}
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
            href={`/bookings/${booking.id}`}
            className="rounded-xl border border-zinc-300 px-5 py-3 text-sm font-semibold text-zinc-700 transition-colors hover:bg-zinc-50"
          >
            Cancel
          </Link>
        </div>
      </form>
    </div>
  );
}
