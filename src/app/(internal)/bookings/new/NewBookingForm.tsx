"use client";

import { useState } from "react";
import Link from "next/link";
import { createBooking } from "../actions";
import { Field, inputClass } from "@/components/Field";
import { BookingItemsBuilder } from "@/components/BookingItemsBuilder";
import { CustomerPicker } from "@/components/CustomerPicker";
import { CustomFieldInputs } from "@/components/CustomFieldInputs";
import type { FieldDefinition } from "@/lib/categoryFields";

type CustomerOption = { id: string; name: string; address?: string | null };
type EquipmentOption = { id: string; label: string; categoryName: string; status: string };

// Delivery address starts blank and autofills from whichever customer is
// selected (existing or newly added inline) — still a plain editable text
// field afterward, since a job doesn't always deliver to the customer's
// address on file.
export function NewBookingForm({
  customers,
  items,
  fieldDefs,
}: {
  customers: CustomerOption[];
  items: EquipmentOption[];
  fieldDefs: FieldDefinition[];
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

      <Field label="Promo Code (optional)" htmlFor="promoCode">
        <input id="promoCode" name="promoCode" placeholder="e.g. SAVE10" className={`${inputClass} uppercase`} />
      </Field>

      <details className="rounded-xl border border-zinc-200 p-3">
        <summary className="cursor-pointer text-sm font-medium text-zinc-700">
          Manual discount (no code — ignored if a promo code is entered above)
        </summary>
        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <Field label="Type" htmlFor="discountType">
            <select id="discountType" name="discountType" defaultValue="" className={inputClass}>
              <option value="">No discount</option>
              <option value="percent">Percent off</option>
              <option value="flat">Dollars off</option>
            </select>
          </Field>
          <Field label="Amount" htmlFor="discountValue">
            <input
              id="discountValue"
              name="discountValue"
              type="number"
              min="0"
              step="0.01"
              className={inputClass}
            />
          </Field>
          <Field label="Reason (optional)" htmlFor="discountReason">
            <input id="discountReason" name="discountReason" className={inputClass} />
          </Field>
        </div>
      </details>

      <Field label="Notes" htmlFor="notes">
        <textarea id="notes" name="notes" rows={3} className={inputClass} />
      </Field>

      <CustomFieldInputs fieldDefs={fieldDefs} />

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
