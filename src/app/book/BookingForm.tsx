"use client";

import { useState, useTransition } from "react";
import { checkAvailability, submitBookingRequest } from "./actions";
import { Field, inputClass } from "@/components/Field";

type CategoryOption = {
  id: string;
  name: string;
  description: string | null;
  basePrice: number | null;
};

function today() {
  return new Date().toISOString().slice(0, 10);
}

export function BookingForm({
  categories,
  agreementTitle,
  agreementContent,
}: {
  categories: CategoryOption[];
  agreementTitle: string;
  agreementContent: string;
}) {
  const [categoryId, setCategoryId] = useState(categories[0]?.id ?? "");
  const selectedCategory = categories.find((c) => c.id === categoryId);
  const [startDate, setStartDate] = useState(today());
  const [endDate, setEndDate] = useState("");
  const [availability, setAvailability] = useState<{
    checked: boolean;
    count: number;
  }>({ checked: false, count: 0 });
  const [isPending, startTransition] = useTransition();

  function runCheck(nextCategoryId: string, nextStart: string, nextEnd: string) {
    if (!nextCategoryId || !nextStart || !nextEnd) {
      setAvailability({ checked: false, count: 0 });
      return;
    }
    startTransition(async () => {
      const result = await checkAvailability(nextCategoryId, nextStart, nextEnd);
      setAvailability({ checked: true, count: result.availableCount });
    });
  }

  return (
    <form action={submitBookingRequest} className="flex flex-col gap-4">
      <Field label="What do you need?" htmlFor="categoryId">
        <select
          id="categoryId"
          name="categoryId"
          required
          className={inputClass}
          value={categoryId}
          onChange={(e) => {
            setCategoryId(e.target.value);
            runCheck(e.target.value, startDate, endDate);
          }}
        >
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </Field>

      {selectedCategory?.basePrice != null && (
        <div className="rounded-xl bg-brand-light p-3 text-sm text-zinc-700">
          <span className="font-semibold text-ink">
            ${selectedCategory.basePrice.toFixed(2)}
          </span>{" "}
          {selectedCategory.description || "Starting price."}
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        <Field label="Delivery Date" htmlFor="startDate">
          <input
            id="startDate"
            name="startDate"
            type="date"
            required
            min={today()}
            className={inputClass}
            value={startDate}
            onChange={(e) => {
              setStartDate(e.target.value);
              runCheck(categoryId, e.target.value, endDate);
            }}
          />
        </Field>
        <Field label="Pickup Date" htmlFor="endDate">
          <input
            id="endDate"
            name="endDate"
            type="date"
            required
            min={startDate}
            className={inputClass}
            value={endDate}
            onChange={(e) => {
              setEndDate(e.target.value);
              runCheck(categoryId, startDate, e.target.value);
            }}
          />
        </Field>
      </div>

      {isPending && (
        <p className="text-sm text-zinc-500">Checking availability…</p>
      )}
      {!isPending && availability.checked && (
        <p
          className={`text-sm font-medium ${
            availability.count > 0 ? "text-brand" : "text-red-600"
          }`}
        >
          {availability.count > 0
            ? "Available for your dates!"
            : "Not available for those dates — try different dates."}
        </p>
      )}

      <Field label="Your Name" htmlFor="name">
        <input id="name" name="name" required className={inputClass} />
      </Field>
      <Field label="Phone" htmlFor="phone">
        <input
          id="phone"
          name="phone"
          type="tel"
          required
          className={inputClass}
        />
      </Field>
      <Field label="Email" htmlFor="email">
        <input
          id="email"
          name="email"
          type="email"
          required
          className={inputClass}
        />
      </Field>
      <Field label="Delivery Address" htmlFor="address">
        <input id="address" name="address" required className={inputClass} />
      </Field>
      <Field label="Anything else we should know? (optional)" htmlFor="notes">
        <textarea id="notes" name="notes" rows={3} className={inputClass} />
      </Field>

      <Field
        label="Photos of the site, junk, or demo area (optional, but helps us quote accurately)"
        htmlFor="photos"
      >
        <input
          id="photos"
          name="photos"
          type="file"
          accept="image/*"
          multiple
          className={inputClass}
        />
      </Field>

      <div>
        <p className="text-sm font-medium text-zinc-700">{agreementTitle}</p>
        <div className="mt-1 max-h-40 overflow-y-auto whitespace-pre-wrap rounded-xl bg-zinc-50 p-3 text-xs text-zinc-600">
          {agreementContent}
        </div>
        <label className="mt-2 flex items-start gap-3 text-sm text-zinc-700">
          <input
            type="checkbox"
            name="agreed"
            required
            className="mt-1 h-5 w-5 flex-shrink-0 rounded border-zinc-300"
          />
          I have read and agree to the terms above. Typing my name above and
          checking this box serves as my electronic signature.
        </label>
      </div>

      <button
        type="submit"
        disabled={availability.checked && availability.count === 0}
        className="rounded-xl bg-brand px-5 py-3 text-base font-semibold text-white transition-colors hover:bg-brand-dark disabled:cursor-not-allowed disabled:opacity-50"
      >
        Request Booking
      </button>
      <p className="text-xs text-zinc-400">
        This sends a request — we&apos;ll contact you shortly to confirm
        details and payment.
      </p>
    </form>
  );
}
