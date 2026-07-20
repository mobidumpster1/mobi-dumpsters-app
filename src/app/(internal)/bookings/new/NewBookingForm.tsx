"use client";

import { useState } from "react";
import Link from "next/link";
import { createBooking } from "../actions";
import { Field, inputClass } from "@/components/Field";
import { BookingItemsBuilder } from "@/components/BookingItemsBuilder";
import { CustomerPicker } from "@/components/CustomerPicker";

type CustomerOption = { id: string; name: string; address?: string | null };
type EquipmentOption = { id: string; label: string; categoryName: string; status: string };

// Delivery address starts blank and autofills from whichever customer is
// selected (existing or newly added inline) — still a plain editable text
// field afterward, since a job doesn't always deliver to the customer's
// address on file.
export function NewBookingForm({
  customers,
  items,
}: {
  customers: CustomerOption[];
  items: EquipmentOption[];
}) {
  // CustomerPicker defaults to selecting the first customer in the list
  // when nothing else is passed — match that here so the address field
  // starts prefilled too, not just after an explicit selection change.
  const [deliveryAddress, setDeliveryAddress] = useState(customers[0]?.address ?? "");

  return (
    <form action={createBooking} className="mt-6 flex flex-col gap-4">
      <CustomerPicker
        customers={customers}
        onSelect={(customer) => setDeliveryAddress(customer.address ?? "")}
      />
      <Field label="Delivery Address" htmlFor="deliveryAddress">
        <input
          id="deliveryAddress"
          name="deliveryAddress"
          required
          value={deliveryAddress}
          onChange={(e) => setDeliveryAddress(e.target.value)}
          className={inputClass}
        />
      </Field>

      <BookingItemsBuilder
        equipmentOptions={items.map((i) => ({
          id: i.id,
          label: i.label,
          categoryName: i.categoryName,
          status: i.status,
        }))}
      />

      <Field label="Notes" htmlFor="notes">
        <textarea id="notes" name="notes" rows={3} className={inputClass} />
      </Field>

      <div className="flex gap-3">
        <button
          type="submit"
          className="rounded-lg bg-brand px-5 py-3 text-sm font-bold text-white transition-colors hover:bg-brand-dark"
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
  );
}
