import Link from "next/link";
import { db } from "@/lib/db";
import { createBooking } from "../actions";
import { Field, inputClass } from "@/components/Field";
import { BookingItemsBuilder } from "@/components/BookingItemsBuilder";

export const dynamic = "force-dynamic";

export default async function NewBookingPage() {
  const [customers, items] = await Promise.all([
    db.customer.findMany({ orderBy: { name: "asc" } }),
    db.equipmentItem.findMany({
      where: { status: { not: "retired" } },
      orderBy: { label: "asc" },
      include: { category: true },
    }),
  ]);

  return (
    <div className="max-w-2xl">
      <h1 className="text-3xl font-bold tracking-tight text-ink">New Booking</h1>
      <form action={createBooking} className="mt-6 flex flex-col gap-4">
        <Field label="Customer" htmlFor="customerId">
          <select id="customerId" name="customerId" required className={inputClass}>
            {customers.length === 0 && <option value="">No customers yet</option>}
            {customers.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </Field>
        {customers.length === 0 && (
          <p className="text-sm text-amber-600">
            You need at least one customer first.{" "}
            <Link href="/customers/new" className="underline">
              Create one
            </Link>
            .
          </p>
        )}
        <Field label="Delivery Address" htmlFor="deliveryAddress">
          <input
            id="deliveryAddress"
            name="deliveryAddress"
            required
            className={inputClass}
          />
        </Field>

        <BookingItemsBuilder
          equipmentOptions={items.map((i) => ({
            id: i.id,
            label: i.label,
            categoryName: i.category.name,
            status: i.status,
          }))}
        />

        <Field label="Notes" htmlFor="notes">
          <textarea id="notes" name="notes" rows={3} className={inputClass} />
        </Field>

        <div className="flex gap-3">
          <button
            type="submit"
            className="rounded-xl bg-brand px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-brand-dark"
          >
            Create Booking
          </button>
          <Link
            href="/bookings"
            className="rounded-xl border border-zinc-300 px-5 py-3 text-sm font-semibold text-zinc-700 transition-colors hover:bg-zinc-50"
          >
            Cancel
          </Link>
        </div>
      </form>
    </div>
  );
}
