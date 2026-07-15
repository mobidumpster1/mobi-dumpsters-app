"use client";

import { useCallback, useState, useTransition } from "react";
import { checkAvailability, getUnavailableStartDates, submitBookingRequest } from "./actions";
import { Field, inputClass } from "@/components/Field";
import { AvailabilityCalendar } from "@/components/AvailabilityCalendar";
import { quoteMaterialDelivery } from "@/lib/materialDelivery";

type PricingTier = { id: string; label: string; days: number; price: number | null };
type MaterialOption = { id: string; name: string; unit: string; pricePerUnit: number };

type CategoryOption = {
  id: string;
  name: string;
  description: string | null;
  dimensions: string | null;
  bookingNote: string | null;
  imageUrl: string | null;
  basePrice: number | null;
  includedDays: number | null;
  overageDayRate: number | null;
  includedTonnage: number | null;
  overageTonnageRate: number | null;
  includedMileage: number | null;
  overageMileageRate: number | null;
  bundleQuantity: number;
  pricingTiers: PricingTier[];
  materialOptions: MaterialOption[];
};

type Step = "browse" | "review" | "form";

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
  if (c.materialOptions.length > 0) {
    const cheapest = c.materialOptions.reduce((min, m) =>
      m.pricePerUnit < min.pricePerUnit ? m : min
    );
    return `From $${cheapest.pricePerUnit.toFixed(2)}/${cheapest.unit}`;
  }
  if (c.basePrice != null) return `Starting at $${c.basePrice.toFixed(2)}`;
  return null;
}

// What's included / overage terms, in plain language — pulled straight
// from the same category pricing fields staff use to compute invoice
// overage line items, so a customer sees the real numbers before booking
// instead of finding out at pickup.
function includedTerms(c: CategoryOption): string[] {
  const lines: string[] = [];
  if (c.includedDays != null && c.overageDayRate != null) {
    lines.push(
      `${c.includedDays} day${c.includedDays === 1 ? "" : "s"} included — after that, it's $${c.overageDayRate.toFixed(2)} for each additional day`
    );
  }
  if (c.includedTonnage != null && c.overageTonnageRate != null) {
    const perContainer =
      c.bundleQuantity > 1 && c.includedTonnage % c.bundleQuantity === 0
        ? ` (${c.includedTonnage / c.bundleQuantity} tons per container)`
        : "";
    lines.push(
      `Included: first ${c.includedTonnage} ton${c.includedTonnage === 1 ? "" : "s"} (${(c.includedTonnage * 2000).toLocaleString()} lbs)${perContainer} and first dump at no extra charge`
    );
  }
  if (c.includedMileage != null && c.overageMileageRate != null) {
    lines.push(
      `${c.includedMileage} mile${c.includedMileage === 1 ? "" : "s"} of delivery included — after that, it's $${c.overageMileageRate.toFixed(2)} for each additional mile`
    );
  }
  if (c.includedTonnage != null && c.overageTonnageRate != null) {
    lines.push(
      `Weight overage: $${c.overageTonnageRate.toFixed(2)} per ton over ${c.includedTonnage} ton${c.includedTonnage === 1 ? "" : "s"} — you'll be notified with documentation before collection`
    );
    lines.push(
      "Extra dump: an additional dump restarts your rental period (priced for the additional days you keep it)"
    );
  }
  if (c.pricingTiers.length > 0) {
    const maxDays = Math.max(...c.pricingTiers.map((t) => t.days));
    lines.push(
      `Max rental length: ${maxDays} days — need it longer? That's treated as a new rental period.`
    );
  }
  return lines;
}

// Short blurb shown under each duration tier on the review step, matching
// Chase's real rate-card copy — computed from the same tonnage/bundle
// fields rather than stored per tier, so it can't drift out of sync with
// the actual included allowance.
function deliveryCaption(c: CategoryOption): string {
  if (c.includedTonnage == null) return "Delivered to your door.";
  if (c.bundleQuantity > 1) {
    const perContainer =
      c.includedTonnage % c.bundleQuantity === 0 ? c.includedTonnage / c.bundleQuantity : null;
    return perContainer != null
      ? `${c.bundleQuantity} containers delivered. First ${perContainer} ton${perContainer === 1 ? "" : "s"} & first dump per can.`
      : `${c.bundleQuantity} containers delivered. First dump per can included.`;
  }
  return `Delivered to your door. First ${c.includedTonnage} ton${c.includedTonnage === 1 ? "" : "s"} & first dump included.`;
}

export function BookingForm({
  categories,
  agreementTitle,
  agreementContent,
  initialCategoryId,
}: {
  categories: CategoryOption[];
  agreementTitle: string;
  agreementContent: string;
  // Set when a link on Chase's own website points straight at one rental
  // (e.g. "Book Junk Removal Online") — skips the browse grid and opens
  // directly on that category's review step, same as tapping its card.
  initialCategoryId?: string;
}) {
  const [step, setStep] = useState<Step>(initialCategoryId ? "review" : "browse");
  const [categoryId, setCategoryId] = useState(initialCategoryId ?? "");
  const selectedCategory = categories.find((c) => c.id === categoryId);
  const hasTiers = (selectedCategory?.pricingTiers.length ?? 0) > 0;

  const [startDate, setStartDate] = useState(today());
  const [deliveryTime, setDeliveryTime] = useState("09:00");
  const [pickupTime, setPickupTime] = useState("09:00");
  const [tierId, setTierId] = useState(
    () => categories.find((c) => c.id === initialCategoryId)?.pricingTiers[0]?.id ?? ""
  );
  const selectedTier = selectedCategory?.pricingTiers.find((t) => t.id === tierId);
  const rangeEnd =
    hasTiers && selectedTier?.price != null
      ? addDaysToDateStr(startDate, selectedTier.days)
      : undefined;

  const hasMaterials = (selectedCategory?.materialOptions.length ?? 0) > 0;
  const [materialOptionId, setMaterialOptionId] = useState(
    () => categories.find((c) => c.id === initialCategoryId)?.materialOptions[0]?.id ?? ""
  );
  const [materialQuantity, setMaterialQuantity] = useState("1");
  const selectedMaterial = selectedCategory?.materialOptions.find(
    (m) => m.id === materialOptionId
  );
  const materialQuantityNum = parseFloat(materialQuantity) || 0;
  const materialQuote =
    selectedMaterial && materialQuantityNum > 0
      ? quoteMaterialDelivery(selectedMaterial.pricePerUnit, materialQuantityNum, selectedMaterial.unit)
      : null;

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

  // Picking a card moves straight to the review step for that rental —
  // terms/overages/dimensions before any date or contact fields, per
  // Chase's ask. Availability isn't checked until the form step, once a
  // duration/date is actually chosen there.
  function onCategoryChange(nextCategoryId: string) {
    setCategoryId(nextCategoryId);
    const nextCategory = categories.find((c) => c.id === nextCategoryId);
    const firstTier = nextCategory?.pricingTiers[0];
    setTierId(firstTier?.id ?? "");
    const firstMaterial = nextCategory?.materialOptions[0];
    setMaterialOptionId(firstMaterial?.id ?? "");
    setMaterialQuantity("1");
    setAvailability({ checked: false, isAvailable: false });
    setStep("review");
  }

  function onContinueToForm() {
    setStep("form");
    if (selectedTier?.price != null) {
      runCheck(categoryId, startDate, addDaysToDateStr(startDate, selectedTier.days));
    } else if (!hasTiers) {
      runCheck(categoryId, startDate, startDate);
    }
  }

  // Tapping a material on the review step (instead of the generic
  // "Continue to Book" button) pre-selects it and jumps straight to the
  // form step, so someone who already knows what they want doesn't have
  // to re-pick it from a dropdown a moment later.
  function onSelectMaterial(nextMaterialOptionId: string) {
    setMaterialOptionId(nextMaterialOptionId);
    onContinueToForm();
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

  const bookable = hasMaterials
    ? selectedMaterial != null && materialQuantityNum > 0
    : hasTiers
      ? selectedTier?.price != null
      : true;
  const terms = selectedCategory ? includedTerms(selectedCategory) : [];

  return (
    <form action={submitBookingRequest} className="flex flex-col gap-4">
      <input type="hidden" name="categoryId" value={categoryId} required />

      {/* Step 1: browse — CSS-hidden (not unmounted) once past it, same as
          the other steps below, so nothing typed further along is lost if
          someone taps Back. */}
      <div className={step === "browse" ? "" : "hidden"}>
        <p className="mb-2 text-sm font-medium text-zinc-700">
          What do you need?
        </p>
        <div className="grid grid-cols-2 gap-3">
          {categories.map((c) => {
            const price = priceLabel(c);
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => onCategoryChange(c.id)}
                className="flex flex-col overflow-hidden rounded-2xl border-2 border-zinc-200 text-left transition-colors hover:border-brand/50"
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

      {/* Step 2: review — terms, overages, dimensions for the picked
          rental, before any booking details are asked for. */}
      {selectedCategory && (
        <div className={step === "review" ? "flex flex-col gap-4" : "hidden"}>
          <button
            type="button"
            onClick={() => setStep("browse")}
            className="self-start text-sm font-semibold text-brand hover:underline"
          >
            ‹ Back to rentals
          </button>

          {selectedCategory.imageUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={selectedCategory.imageUrl}
              alt={selectedCategory.name}
              className="h-48 w-full rounded-xl bg-zinc-50 object-contain"
            />
          )}

          <div>
            <h2 className="text-xl font-bold text-ink">{selectedCategory.name}</h2>
            <div className="mt-1 flex flex-wrap items-center gap-2 text-sm">
              {priceLabel(selectedCategory) && (
                <span className="font-semibold text-brand">
                  {priceLabel(selectedCategory)}
                </span>
              )}
              {selectedCategory.dimensions && (
                <span className="text-zinc-400">{selectedCategory.dimensions}</span>
              )}
            </div>
          </div>

          {selectedCategory.description && (
            <p className="text-sm text-zinc-600">{selectedCategory.description}</p>
          )}

          {selectedCategory.pricingTiers.length > 0 && (
            <div className="grid grid-cols-2 gap-2">
              {selectedCategory.pricingTiers.map((tier) => (
                <div key={tier.id} className="rounded-xl border border-zinc-200 p-3">
                  <p className="text-sm font-semibold text-ink">{tier.label}</p>
                  <p className="text-sm font-semibold text-brand">
                    {tier.price != null ? `$${tier.price.toFixed(2)}` : "Call"}
                  </p>
                  <p className="mt-1 text-xs text-zinc-500">
                    {tier.price != null
                      ? deliveryCaption(selectedCategory)
                      : "Short-term rentals at this length are quoted by job — call for pricing."}
                  </p>
                </div>
              ))}
            </div>
          )}

          {selectedCategory.materialOptions.length > 0 && (
            <div>
              <p className="mb-2 text-xs text-zinc-400">
                Tap a material to book it directly.
              </p>
              <div className="grid grid-cols-2 gap-2">
                {selectedCategory.materialOptions.map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => onSelectMaterial(m.id)}
                    className="rounded-xl border border-zinc-200 p-3 text-left transition-colors hover:border-brand/50"
                  >
                    <p className="text-sm font-semibold text-ink">{m.name}</p>
                    <p className="text-sm font-semibold text-brand">
                      ${m.pricePerUnit.toFixed(2)}/{m.unit}
                    </p>
                  </button>
                ))}
              </div>
            </div>
          )}

          {selectedCategory.bookingNote && (
            <p className="whitespace-pre-line rounded-xl bg-zinc-50 p-3 text-sm text-zinc-600">
              {selectedCategory.bookingNote}
            </p>
          )}

          {terms.length > 0 && (
            <div className="rounded-xl bg-zinc-50 p-4">
              <p className="mb-2 text-sm font-semibold text-ink">What&apos;s included</p>
              <ul className="flex flex-col gap-1 text-sm text-zinc-600">
                {terms.map((line) => (
                  <li key={line}>• {line}</li>
                ))}
              </ul>
            </div>
          )}

          <div>
            <p className="text-sm font-semibold text-ink">{agreementTitle}</p>
            <div className="mt-1 max-h-40 overflow-y-auto whitespace-pre-wrap rounded-xl bg-zinc-50 p-3 text-xs text-zinc-600">
              {agreementContent}
            </div>
            <p className="mt-1 text-xs text-zinc-400">
              You&apos;ll confirm you agree to this on the next step.
            </p>
          </div>

          <button
            type="button"
            onClick={onContinueToForm}
            className="rounded-xl bg-brand px-5 py-3 text-base font-semibold text-white transition-colors hover:bg-brand-dark"
          >
            Continue to Book →
          </button>
        </div>
      )}

      {/* Step 3: the actual booking details — duration/date/contact info,
          submitted together with the hidden categoryId above. */}
      {selectedCategory && (
        <div className={step === "form" ? "flex flex-col gap-4" : "hidden"}>
          <button
            type="button"
            onClick={() => setStep("review")}
            className="self-start text-sm font-semibold text-brand hover:underline"
          >
            ‹ Back to details
          </button>

          <div className="flex items-center gap-3 rounded-xl bg-zinc-50 p-3">
            {selectedCategory.imageUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={selectedCategory.imageUrl}
                alt={selectedCategory.name}
                className="h-12 w-12 flex-shrink-0 rounded-lg bg-white object-contain"
              />
            )}
            <p className="text-sm font-semibold text-ink">{selectedCategory.name}</p>
          </div>

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
                {selectedCategory.pricingTiers.map((tier) => (
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

          {hasMaterials && (
            <>
              <Field label="Material" htmlFor="materialOptionId">
                <select
                  id="materialOptionId"
                  name="materialOptionId"
                  required
                  className={inputClass}
                  value={materialOptionId}
                  onChange={(e) => setMaterialOptionId(e.target.value)}
                >
                  {selectedCategory.materialOptions.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name} — ${m.pricePerUnit.toFixed(2)}/{m.unit}
                    </option>
                  ))}
                </select>
              </Field>
              <Field
                label={`Quantity (${selectedMaterial?.unit ?? "units"})`}
                htmlFor="materialQuantity"
              >
                <input
                  id="materialQuantity"
                  name="materialQuantity"
                  type="number"
                  min="0.5"
                  step="0.5"
                  required
                  className={inputClass}
                  value={materialQuantity}
                  onChange={(e) => setMaterialQuantity(e.target.value)}
                />
              </Field>
              {materialQuote && (
                <div className="rounded-xl bg-zinc-50 p-3 text-sm">
                  <p className="font-semibold text-ink">
                    {materialQuote.isCustomQuote ? "Estimated total" : "Total"}: $
                    {materialQuote.total.toFixed(2)}
                  </p>
                  <p className="mt-1 text-xs text-zinc-500">{materialQuote.note}</p>
                </div>
              )}
            </>
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
        </div>
      )}
    </form>
  );
}
