"use client";

import { useState, useTransition } from "react";
import { checkAvailability, submitBookingRequest } from "./actions";
import { Field, inputClass } from "@/components/Field";

type PricingTier = { id: string; label: string; days: number; price: number | null };

type CategoryOption = {
  id: string;
  name: string;
  description: string | null;
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
  const [endDate, setEndDate] = useState("");
  const [tierId, setTierId] = useState(selectedCategory?.pricingTiers[0]?.id ?? "");
  const selectedTier = selectedCategory?.pricingTiers.find((t) => t.id === tierId);

  const [availability, setAvailability] = useState<{
    checked: boolean;
    isAvailable: boolean;
  }>({ checked: false, isAvailable: false });
  const [isPending, startTransition] = useTransition();

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
      runCheck(nextCategoryId, startDate, endDate);
    }
  }

  function onStartDateChange(nextStart: string) {
    setStartDate(nextStart);
    if (selectedTier) {
      runCheck(categoryId, nextStart, addDaysToDateStr(nextStart, selectedTier.days));
    } else {
      runCheck(categoryId, nextStart, endDate);
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
      <Field label="What do you need?" htmlFor="categoryId">
        <select
          id="categoryId"
          name="categoryId"
          required
          className={inputClass}
          value={categoryId}
          onChange={(e) => onCategoryChange(e.target.value)}
        >
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </Field>

      {hasTiers && selectedCategory?.description && (
        <p className="text-sm text-zinc-500">{selectedCategory.description}</p>
      )}

      {!hasTiers && selectedCategory?.basePrice != null && (
        <div className="rounded-xl bg-brand-light p-3 text-sm text-zinc-700">
          <span className="font-semibold text-ink">
            ${selectedCategory.basePrice.toFixed(2)}
          </span>{" "}
          {selectedCategory.description || "Starting price."}
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

      <div className={hasTiers ? "grid grid-cols-1 gap-4" : "grid grid-cols-2 gap-4"}>
        <Field label="Delivery Date" htmlFor="startDate">
          <input
            id="startDate"
            name="startDate"
            type="date"
            required
            min={today()}
            className={inputClass}
            value={startDate}
            onChange={(e) => onStartDateChange(e.target.value)}
          />
        </Field>
        {!hasTiers && (
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
        )}
      </div>

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
