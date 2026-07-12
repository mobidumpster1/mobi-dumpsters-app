"use client";

import { useCallback, useState, useTransition } from "react";
import { checkAvailability, getUnavailableStartDates, submitBookingRequest } from "./actions";
import { Field, inputClass } from "@/components/Field";
import { AvailabilityCalendar } from "@/components/AvailabilityCalendar";

type PricingTier = { id: string; label: string; days: number; price: number | null };

type CategoryOption = {
  id: string;
  name: string;
  description: string | null;
  dimensions: string | null;
  imageUrl: string | null;
  basePrice: number | null;
  pricingTiers: PricingTier[];
};

function today() {
  return new Date().toISOString().slice(0, 10);
}

function addDaysToDateStr(dateStr: string, days: number) {
  const date = new Date(`${dateStr}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function priceLabel(c: CategoryOption) {
  if (c.pricingTiers.length > 0) {
    const priced = c.pricingTiers.filter((t) => t.price != null);
    if (priced.length === 0) return "Call for pricing";
    const min = Math.min(...priced.map((t) => t.price as number));
    return `From $${min.toFixed(2)}`;
  }
  if (c.basePrice != null) return `Starting at $${c.basePrice.toFixed(2)}`;
  return null;
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
  const hasTiers = (selectedCategory?.pricingTiers.length ?? 0) > 0;

  const [startDate, setStartDate] = useState(today());
  const [deliveryTime, setDeliveryTime] = useState("09:00");
  const [pickupTime, setPickupTime] = useState("09:00");
  const [tierId, setTierId] = useState(selectedCategory?.pricingTiers[0]?.id ?? "");
  const selectedTier = selectedCategory?.pricingTiers.find((t) => t.id === tierId);
  const rangeEnd =
    hasTiers && selectedTier?.price != null
      ? addDaysToDateStr(startDate, selectedTier.days)
      : undefined;

  const [availability, setAvailability] = useState<{
    checked: boolean;
    isAvailable: boolean;
  }>({ checked: false, isAvailable: false });
  const [isPending, startTransition] = useTransition();

  const durationDays = hasTiers ? (selectedTier?.days ?? 1) : 1;
  const fetchUnavailable = useCallback(
    (monthStart: string) => getUnavailableStartDates(categoryId, monthStart, durationDays),
    [categoryId, durationDays]
  );

  function runCheck(nextCategoryId: string, nextStart: string, nextEnd: string) {
    if (!nextCategoryId || !nextStart || !nextEnd) {
      setAvailability({ checked: false, isAvailable: false });
      return;
    }
    startTransition(async () => {
      const result = await checkAvailability(nextCategoryId, nextStart, nextEnd);
      setAvailability({ checked: true, isAvailable: result.isAvailable });
    });
  }

  function onCategoryChange(nextCategoryId: string) {
    setCategoryId(nextCategoryId);
    const nextCategory = categories.find((c) => c.id === nextCategoryId);
    const firstTier = nextCategory?.pricingTiers[0];
    setTierId(firstTier?.id ?? "");
    if (nextCategory && nextCategory.pricingTiers.length > 0) {
      if (firstTier?.price != null) {
        runCheck(nextCategoryId, startDate, addDaysToDateStr(startDate, firstTier.days));
      } else {
        setAvailability({ checked: false, isAvailable: false });
      }
    } else {
      runCheck(nextCategoryId, startDate, startDate);
    }
  }

  function onStartDateChange(nextStart: string) {
    setStartDate(nextStart);
    if (selectedTier) {
      runCheck(categoryId, nextStart, addDaysToDateStr(nextStart, selectedTier.days));
    } else {
      runCheck(categoryId, nextStart, nextStart);
    }
  }

  function onTierChange(nextTierId: string) {
    setTierId(nextTierId);
    const tier = selectedCategory?.pricingTiers.find((t) => t.id === nextTierId);
    if (tier?.price != null) {
      runCheck(categoryId, startDate, addDaysToDateStr(startDate, tier.days));
    } else {
      setAvailability({ checked: false, isAvailable: false });
    }
  }

  const bookable = hasTiers ? selectedTier?.price != null : true;

  return (
    <form action={submitBookingRequest} className="flex flex-col gap-4">
      <div>
        <p className="mb-2 text-sm font-medium text-zinc-700">
          What do you need?
        </p>
        <input type="hidden" name="categoryId" value={categoryId} required />
        <div className="grid grid-cols-2 gap-3">
          {categories.map((c) => {
            const selected = c.id === categoryId;
            const price = priceLabel(c);
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => onCategoryChange(c.id)}
                className={`flex flex-col overflow-hidden rounded-2xl border-2 text-left transition-colors ${
                  selected
                    ? "border-brand ring-2 ring-brand/30"
                    : "border-zinc-200 hover:border-brand/50"
                }`}
              >
                {c.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={c.imageUrl}
                    alt={c.name}
                    className="h-28 w-full bg-zinc-50 object-contain"
                  />
                ) : (
                  <div className="h-28 w-full bg-zinc-100" />
                )}
                <div className="p-2.5">
                  <p className="text-sm font-semibold text-ink">{c.name}</p>
                  {price && (
                    <p className="text-xs text-zinc-500">{price}</p>
                  )}
                  {c.dimensions && (
                    <p className="mt-0.5 text-xs text-zinc-400">{c.dimensions}</p>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {hasTiers && selectedCategory?.description && (
        <p className="text-sm text-zinc-500">{selectedCategory.description}</p>
      )}

      {!hasTiers && selectedCategory?.basePrice != null && (
        <div className="rounded-xl bg-brand-light p-3 text-sm text-zinc-700">
          {selectedCategory.description || `Starting at $${selectedCategory.basePrice.toFixed(2)}.`}
        </div>
      )}

      {hasTiers && (
        <Field label="How long do you need it?" htmlFor="tierId">
          <select
            id="tierId"
            name="tierId"
            required
            className={inputClass}
            value={tierId}
            onChange={(e) => onTierChange(e.target.value)}
          >
            {selectedCategory?.pricingTiers.map((tier) => (
              <option key={tier.id} value={tier.id}>
                {tier.label} — {tier.price != null ? `$${tier.price.toFixed(2)}` : "Call for pricing"}
              </option>
            ))}
          </select>
        </Field>
      )}

      {hasTiers && selectedTier?.price == null && (
        <p className="text-sm font-medium text-red-600">
          That duration isn&apos;t bookable online — please call us for pricing.
        </p>
      )}

      <Field label="Delivery Date" htmlFor="startDate">
        <input type="hidden" id="startDate" name="startDate" value={startDate} />
        <AvailabilityCalendar
          value={startDate}
          rangeEnd={rangeEnd}
          minDate={today()}
          onChange={onStartDateChange}
          fetchUnavailable={fetchUnavailable}
        />
      </Field>

      {hasTiers && (
        <div className="grid grid-cols-2 gap-4">
          <Field label="Delivery Time" htmlFor="deliveryTime">
            <input
              id="deliveryTime"
              name="deliveryTime"
              type="time"
              required
              className={inputClass}
              value={deliveryTime}
              onChange={(e) => setDeliveryTime(e.target.value)}
            />
          </Field>
          <Field label="Pickup Time" htmlFor="pickupTime">
            <input
              id="pickupTime"
              name="pickupTime"
              type="time"
              required
              className={inputClass}
              value={pickupTime}
              onChange={(e) => setPickupTime(e.target.value)}
            />
          </Field>
        </div>
      )}

      {isPending && (
        <p className="text-sm text-zinc-500">Checking availability…</p>
      )}
      {!isPending && availability.checked && (
        <p
          className={`text-sm font-medium ${
            availability.isAvailable ? "text-brand" : "text-red-600"
          }`}
        >
          {availability.isAvailable
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
        disabled={!bookable || (availability.checked && !availability.isAvailable)}
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
