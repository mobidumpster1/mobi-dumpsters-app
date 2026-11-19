"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { checkAvailability, geocodePreview, getUnavailableStartDates, submitBookingRequest } from "./actions";
import { Field, inputClass } from "@/components/Field";
import { formatDate } from "@/lib/date";
import { AvailabilityCalendar } from "@/components/AvailabilityCalendar";
import { PlacementMap } from "@/components/PlacementMap";
import { containerFootprint } from "@/lib/containerSize";
import { quoteMaterialDelivery } from "@/lib/materialDelivery";
import {
  priceLabel,
  sortPriceValue,
  includedTerms,
  deliveryCaption,
  type CategoryOption,
} from "./categoryPricing";

// Re-exported so existing imports (`import { CategoryOption } from
// "./BookingForm"`) keep working — the actual definitions live in
// categoryPricing.ts now, a plain module reachable from server code too
// (see that file's doc comment for why).
export type { CategoryOption };
export { priceLabel, includedTerms };

type Step = "browse" | "review" | "form";

function today() {
  return new Date().toISOString().slice(0, 10);
}

function addDaysToDateStr(dateStr: string, days: number) {
  const date = new Date(`${dateStr}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

type SortOption = "recommended" | "price_asc" | "price_desc" | "name";

export type BookingFormProps = {
  categories: CategoryOption[];
  agreementTitle: string;
  agreementContent: string;
  // Set when a link on Chase's own website points straight at one rental
  // (e.g. "Book Junk Removal Online") — skips the browse grid and opens
  // directly on that category's review step, same as tapping its card.
  initialCategoryId?: string;
  // Threaded through as a hidden field so submitBookingRequest can carry
  // embed=1 into the thank-you redirect — otherwise a customer who books
  // inside an iframe lands on a broken (non-transparent, non-resizing)
  // confirmation screen. See book/thank-you/page.tsx.
  isEmbed?: boolean;
  // Shown in the "questions?" strip - the business's own call/text number.
  contactPhone?: string;
};

const STEP_LABELS: { id: Step; label: string }[] = [
  { id: "browse", label: "Choose a size" },
  { id: "review", label: "Review details" },
  { id: "form", label: "Dates & booking" },
];

// Where the customer is in the three steps - always visible, so they know how
// close they are to done.
function Stepper({ step }: { step: Step }) {
  const current = STEP_LABELS.findIndex((x) => x.id === step);
  return (
    <ol className="flex flex-wrap gap-2" aria-label="Progress">
      {STEP_LABELS.map((item, index) => {
        const state = index < current ? "done" : index === current ? "current" : "todo";
        return (
          <li
            key={item.id}
            aria-current={state === "current" ? "step" : undefined}
            className={`flex items-center gap-2 rounded-full py-1.5 pl-1.5 pr-3.5 text-sm font-semibold ${
              state === "current" ? "bg-brand text-on-brand" : "bg-zinc-100 text-zinc-600"
            }`}
          >
            <span
              className={`grid h-6 w-6 place-items-center rounded-full text-xs font-extrabold ${
                state === "todo" ? "bg-zinc-200 text-zinc-600" : "bg-accent text-accent-ink"
              }`}
            >
              {state === "done" ? "✓" : index + 1}
            </span>
            {item.label}
          </li>
        );
      })}
    </ol>
  );
}

// The service agreement as a readable, keyboard-scrollable box with a
// full-screen reader. The "I agree" checkbox stays locked until the customer
// has scrolled to the end (or the whole text already fits), so agreeing
// means they had the chance to read it.
function AgreementReader({
  title,
  content,
  active,
  onRead,
}: {
  title: string;
  content: string;
  active: boolean;
  onRead: () => void;
}) {
  const boxRef = useRef<HTMLDivElement>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [atEnd, setAtEnd] = useState(false);

  const check = useCallback(
    (target?: HTMLElement | null) => {
      const el = target ?? boxRef.current;
      if (!el || el.clientHeight === 0) return;
      if (el.scrollTop + el.clientHeight >= el.scrollHeight - 6) {
        setAtEnd(true);
        onRead();
      }
    },
    [onRead]
  );

  // The box is display:none until its step is showing, so re-measure then.
  useEffect(() => {
    if (active) check();
  }, [active, check]);

  return (
    <div className="rounded-2xl border-2 border-zinc-200 bg-white">
      <div className="flex items-center justify-between gap-3 border-b border-zinc-200 bg-zinc-50 px-4 py-2.5">
        <p className="text-sm font-bold text-ink">{title}</p>
        <button
          type="button"
          onClick={() => dialogRef.current?.showModal()}
          className="min-h-9 px-1 text-sm font-bold text-brand-fg hover:underline"
        >
          Read full screen
        </button>
      </div>
      <div
        ref={boxRef}
        onScroll={() => check()}
        tabIndex={0}
        role="region"
        aria-label={`${title}, scrollable`}
        className="max-h-52 overflow-y-auto whitespace-pre-wrap px-4 py-3 text-sm leading-relaxed text-zinc-700"
      >
        {content}
      </div>
      <p
        className={`border-t border-zinc-200 px-4 py-2 text-xs ${
          atEnd ? "bg-brand/10 font-bold text-brand-fg" : "bg-zinc-50 text-zinc-500"
        }`}
        aria-live="polite"
      >
        {atEnd ? "You've reached the end - you can agree below." : "Scroll to the end to unlock the agreement box."}
      </p>

      <dialog
        ref={dialogRef}
        className="m-auto max-h-[88vh] w-[min(92vw,44rem)] rounded-2xl p-0 backdrop:bg-black/60"
        onClick={(e) => {
          if (e.target === dialogRef.current) dialogRef.current?.close();
        }}
      >
        <div className="flex max-h-[88vh] flex-col bg-white text-ink">
          <div className="flex items-center justify-between gap-3 border-b border-zinc-200 px-5 py-3">
            <h3 className="font-display text-lg font-bold">{title}</h3>
            <button
              type="button"
              onClick={() => dialogRef.current?.close()}
              className="min-h-11 rounded-xl bg-brand px-4 text-sm font-bold text-on-brand"
            >
              Close
            </button>
          </div>
          <div
            tabIndex={0}
            onScroll={(e) => check(e.currentTarget)}
            className="overflow-y-auto whitespace-pre-wrap px-5 py-4 text-sm leading-relaxed text-zinc-700"
          >
            {content}
          </div>
        </div>
      </dialog>
    </div>
  );
}

function NextSteps({ contactPhone }: { contactPhone?: string }) {
  const digits = contactPhone?.replace(/\D/g, "");
  return (
    <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4">
      <p className="text-sm font-bold text-ink">What happens next</p>
      <ol className="mt-2 flex flex-col gap-2 text-sm text-zinc-600">
        {["You send your request.", "We confirm by phone or text.", "We deliver on your day.", "We pick it up when your rental ends."].map(
          (line, index) => (
            <li key={line} className="flex items-start gap-2.5">
              <span className="grid h-6 w-6 flex-shrink-0 place-items-center rounded-full bg-brand/15 text-xs font-extrabold text-brand-fg">
                {index + 1}
              </span>
              <span className="pt-0.5">{line}</span>
            </li>
          )
        )}
      </ol>
      {digits && digits.length >= 10 && (
        <a
          href={`tel:${digits}`}
          className="mt-3 flex min-h-11 items-center justify-center rounded-xl border-2 border-brand px-4 text-sm font-bold text-brand-fg transition-colors hover:bg-brand/10"
        >
          Questions? Call or text {contactPhone}
        </a>
      )}
    </div>
  );
}

export function BookingForm({
  categories,
  agreementTitle,
  agreementContent,
  initialCategoryId,
  isEmbed,
  contactPhone,
}: BookingFormProps) {
  const [step, setStep] = useState<Step>(initialCategoryId ? "review" : "browse");
  const [categoryId, setCategoryId] = useState(initialCategoryId ?? "");
  const selectedCategory = categories.find((c) => c.id === categoryId);
  const hasTiers = (selectedCategory?.pricingTiers.length ?? 0) > 0;
  const crossSellSuggestions = selectedCategory
    ? categories.filter((c) => selectedCategory.crossSellCategoryIds.includes(c.id))
    : [];

  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<SortOption>("recommended");
  const visibleCategories = categories
    .filter((c) => {
      const q = search.trim().toLowerCase();
      if (!q) return true;
      return c.name.toLowerCase().includes(q) || (c.description ?? "").toLowerCase().includes(q);
    })
    .sort((a, b) => {
      if (sort === "price_asc") return sortPriceValue(a) - sortPriceValue(b);
      if (sort === "price_desc") return sortPriceValue(b) - sortPriceValue(a);
      if (sort === "name") return a.name.localeCompare(b.name);
      return 0; // "recommended" — the order staff set up in Equipment
    });

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

  // Submitted by hand (not via <form action>) so a rejected request can show
  // its message right here and leave everything the customer typed in place
  // — React resets a form's uncontrolled fields after an action completes,
  // and a thrown error used to replace the whole page with a generic crash
  // screen. Also keeps the button disabled while the request is in flight,
  // so a double-click can't send it twice.
  const [isSubmitting, startSubmit] = useTransition();
  const [submitError, setSubmitError] = useState<string | null>(null);
  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    setSubmitError(null);
    startSubmit(async () => {
      const result = await submitBookingRequest(formData);
      if (result?.error) setSubmitError(result.error);
    });
  }

  // Controlled (unlike most other fields here) so a cross-sell suggestion
  // tapped on the review step can flag interest into it — staff see the
  // note and can follow up with a combined quote, since the public flow
  // only ever books one category per request.
  const [notes, setNotes] = useState("");
  function toggleCrossSellInterest(name: string) {
    const line = `Interested in: ${name}`;
    setNotes((prev) =>
      prev.split("\n").includes(line)
        ? prev
            .split("\n")
            .filter((l) => l !== line)
            .join("\n")
            .trim()
        : prev
          ? `${prev}\n${line}`
          : line
    );
  }

  // Address is controlled (unlike most other fields) so typing it can drive
  // a debounced geocode preview, which centers the placement map and seeds
  // its default pin — same geocodeAddress() helper submitBookingRequest
  // itself uses, so the preview matches what actually gets stored.
  const [address, setAddress] = useState("");
  const [geocodeCenter, setGeocodeCenter] = useState<{ lat: number; lng: number } | null>(null);
  const [placementPoint, setPlacementPoint] = useState<{ lat: number; lng: number } | null>(null);
  // Which way the container sits on that spot (degrees clockwise from north
  // for its long side), set by the Turn controls on the placement map.
  const [placementRotation, setPlacementRotation] = useState(0);
  const [agreementRead, setAgreementRead] = useState(false);
  const [agreed, setAgreed] = useState(false);
  // Once the customer drags/taps the placement map themselves, further
  // address edits stop re-centering their pin — a ref (not state) so the
  // debounced geocode callback always reads the latest value even if it
  // fires after a later render.
  const placementTouchedRef = useRef(false);
  const addressDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function onAddressChange(next: string) {
    setAddress(next);
    if (addressDebounceRef.current) clearTimeout(addressDebounceRef.current);
    addressDebounceRef.current = setTimeout(async () => {
      // Once the pin has been manually placed, later address edits shouldn't
      // recenter the map out from under it — that made an already-placed
      // pin scroll off-screen and look like it had vanished.
      if (placementTouchedRef.current) return;
      const result = await geocodePreview(next);
      if (result && !placementTouchedRef.current) {
        const point = { lat: result.latitude, lng: result.longitude };
        setGeocodeCenter(point);
        setPlacementPoint(point);
      }
    }, 800);
  }

  function onPlacementChange(point: { lat: number; lng: number }) {
    placementTouchedRef.current = true;
    setPlacementPoint(point);
  }

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

  // Drives the checkout step's order-summary total — same priority as
  // `bookable` above (materials, then tiers, then a flat base rate).
  const summaryTotal = hasMaterials
    ? (materialQuote?.total ?? null)
    : hasTiers
      ? (selectedTier?.price ?? null)
      : (selectedCategory?.basePrice ?? null);

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <input type="hidden" name="categoryId" value={categoryId} required />
      {isEmbed && <input type="hidden" name="embed" value="1" />}
      <Stepper step={step} />

      {/* Step 1: browse — CSS-hidden (not unmounted) once past it, same as
          the other steps below, so nothing typed further along is lost if
          someone taps Back. */}
      <div className={step === "browse" ? "" : "hidden"}>
        <h2 className="mb-3 font-display text-2xl font-extrabold tracking-tight text-ink">
          What do you need?
        </h2>

        <div className="mb-3 flex flex-col gap-2 sm:flex-row">
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search…"
            className={`${inputClass} flex-1`}
          />
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as SortOption)}
            className={inputClass}
          >
            <option value="recommended">Recommended</option>
            <option value="price_asc">Price: Low to High</option>
            <option value="price_desc">Price: High to Low</option>
            <option value="name">Name: A to Z</option>
          </select>
        </div>

        {visibleCategories.length === 0 && (
          <p className="py-6 text-center text-sm text-zinc-500">
            Nothing matches &ldquo;{search}&rdquo;.
          </p>
        )}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {visibleCategories.map((c) => {
            const price = priceLabel(c);
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => onCategoryChange(c.id)}
                className="group flex flex-col overflow-hidden rounded-2xl border border-zinc-200 bg-white text-left shadow-sm transition-all hover:-translate-y-1 hover:shadow-lg"
              >
                <div className="relative w-full bg-zinc-50">
                  {c.imageUrl ? (
                    // Kept object-contain (never crops) - real dumpster photos
                    // can carry dimension callouts a customer needs to see.
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={c.imageUrl} alt={c.name} className="h-44 w-full object-contain sm:h-52" />
                  ) : (
                    <div className="flex h-44 w-full items-center justify-center bg-zinc-100 text-xs text-zinc-500 sm:h-52">
                      No photo yet
                    </div>
                  )}
                  {price && (
                    <span className="absolute bottom-3 left-3 rounded-full bg-accent px-3 py-1.5 text-sm font-extrabold text-accent-ink shadow-md">
                      {price}
                    </span>
                  )}
                </div>
                <div className="flex flex-1 flex-col gap-1 p-4">
                  <h3 className="font-display text-lg font-bold leading-tight text-ink">{c.name}</h3>
                  {c.dimensions && <p className="text-xs text-zinc-500">{c.dimensions}</p>}
                  <span className="mt-2 text-sm font-bold text-brand-fg">Choose this size &rarr;</span>
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
            className="self-start text-sm font-semibold text-brand-fg hover:underline"
          >
            ‹ Back to rentals
          </button>

          {selectedCategory.imageUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={selectedCategory.imageUrl}
              alt={selectedCategory.name}
              className="h-52 w-full rounded-2xl bg-zinc-50 object-contain"
            />
          )}

          <div>
            <h2 className="font-display text-3xl font-extrabold tracking-tight text-ink">{selectedCategory.name}</h2>
            <div className="mt-1 flex flex-wrap items-center gap-2 text-sm">
              {priceLabel(selectedCategory) && (
                <span className="font-semibold text-brand-fg">
                  {priceLabel(selectedCategory)}
                </span>
              )}
              {selectedCategory.dimensions && (
                <span className="text-zinc-500">{selectedCategory.dimensions}</span>
              )}
            </div>
          </div>

          {selectedCategory.description && (
            <p className="text-sm text-zinc-600">{selectedCategory.description}</p>
          )}

          {selectedCategory.pricingTiers.length > 0 && (
            <div className="grid grid-cols-2 gap-2">
              {selectedCategory.pricingTiers.map((tier) => (
                <div key={tier.id} className="rounded-2xl border-2 border-zinc-200 p-4">
                  <p className="text-sm font-semibold text-ink">{tier.label}</p>
                  <p className="text-2xl font-extrabold tracking-tight text-ink">
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
              <p className="mb-2 text-xs text-zinc-500">
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
                    <p className="text-sm font-semibold text-brand-fg">
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

          {crossSellSuggestions.length > 0 && (
            <div className="rounded-xl border border-zinc-200 p-4">
              <p className="mb-2 text-sm font-semibold text-ink">You might also need</p>
              <div className="flex flex-col gap-2">
                {crossSellSuggestions.map((suggestion) => {
                  const interested = notes.split("\n").includes(`Interested in: ${suggestion.name}`);
                  return (
                    <button
                      key={suggestion.id}
                      type="button"
                      onClick={() => toggleCrossSellInterest(suggestion.name)}
                      className={`flex items-center justify-between gap-3 rounded-lg border p-2.5 text-left transition-colors ${
                        interested ? "border-brand bg-brand/5" : "border-zinc-200 hover:border-brand/50"
                      }`}
                    >
                      <div className="flex min-w-0 items-center gap-2.5">
                        {suggestion.imageUrl && (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={suggestion.imageUrl}
                            alt=""
                            className="h-10 w-10 flex-shrink-0 rounded bg-zinc-50 object-contain"
                          />
                        )}
                        <span className="min-w-0">
                          <span className="block truncate text-sm font-semibold text-ink">
                            {suggestion.name}
                          </span>
                          {suggestion.description && (
                            <span className="block truncate text-xs text-zinc-500">
                              {suggestion.description}
                            </span>
                          )}
                        </span>
                      </div>
                      <span className="flex-shrink-0 text-xs font-semibold text-brand-fg">
                        {interested ? "Added ✓" : "+ I'm interested"}
                      </span>
                    </button>
                  );
                })}
              </div>
              <p className="mt-2 text-xs text-zinc-500">
                We&apos;ll follow up on anything you flag here — it&apos;s just a note for now, not a
                separate order.
              </p>
            </div>
          )}

          <div>
            <p className="text-sm font-semibold text-ink">{agreementTitle}</p>
            <div
              tabIndex={0}
              role="region"
              aria-label={`${agreementTitle}, scrollable`}
              className="mt-1 max-h-56 overflow-y-auto whitespace-pre-wrap rounded-xl border border-zinc-200 bg-zinc-50 p-3 text-sm leading-relaxed text-zinc-700"
            >
              {agreementContent}
            </div>
            <p className="mt-1 text-xs text-zinc-500">
              You&apos;ll confirm you agree to this on the last step.
            </p>
          </div>

          <button
            type="button"
            onClick={onContinueToForm}
            className="min-h-14 rounded-xl bg-accent px-5 text-lg font-extrabold text-accent-ink transition-all hover:brightness-105 active:scale-[0.99]"
          >
            Continue to Book &rarr;
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
            className="self-start text-sm font-semibold text-brand-fg hover:underline"
          >
            ‹ Back to details
          </button>

          {/* Order summary — what's picked and a running total, kept live as
              duration/material/date change below (all the same state this
              reads from). Previously this step showed no price at all once
              past Review, so there was nothing to check against while
              filling in contact details. */}
          <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4">
            <div className="flex items-center gap-3">
              {selectedCategory.imageUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={selectedCategory.imageUrl}
                  alt={selectedCategory.name}
                  className="h-14 w-14 flex-shrink-0 rounded-lg bg-white object-contain"
                />
              )}
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-ink">{selectedCategory.name}</p>
                <p className="text-xs text-zinc-500">{deliveryCaption(selectedCategory)}</p>
              </div>
            </div>

            <div className="mt-3 flex flex-col gap-1.5 border-t border-zinc-200 pt-3 text-sm">
              {hasTiers && selectedTier && (
                <div className="flex items-center justify-between">
                  <span className="text-zinc-600">{selectedTier.label} rental</span>
                  <span className="font-medium text-ink">
                    {selectedTier.price != null ? `$${selectedTier.price.toFixed(2)}` : "Call for pricing"}
                  </span>
                </div>
              )}
              {hasMaterials && selectedMaterial && (
                <div className="flex items-center justify-between">
                  <span className="text-zinc-600">
                    {materialQuantityNum || 0} {selectedMaterial.unit} of {selectedMaterial.name}
                  </span>
                  <span className="font-medium text-ink">
                    {materialQuote ? `$${materialQuote.materialTotal.toFixed(2)}` : "—"}
                  </span>
                </div>
              )}
              {!hasTiers && !hasMaterials && (
                <div className="flex items-center justify-between">
                  <span className="text-zinc-600">Base rate</span>
                  <span className="font-medium text-ink">
                    {selectedCategory.basePrice != null ? `$${selectedCategory.basePrice.toFixed(2)}` : "We'll confirm your price"}
                  </span>
                </div>
              )}
              {hasMaterials && materialQuote && materialQuote.deliveryFee > 0 && (
                <div className="flex items-center justify-between">
                  <span className="text-zinc-600">Delivery</span>
                  <span className="font-medium text-ink">${materialQuote.deliveryFee.toFixed(2)}</span>
                </div>
              )}
              {startDate && (
                <div className="flex items-center justify-between text-xs text-zinc-500">
                  <span>Delivery date</span>
                  <span>
                    {formatDate(new Date(`${startDate}T00:00:00.000Z`))}
                    {rangeEnd ? ` – ${formatDate(new Date(`${rangeEnd}T00:00:00.000Z`))}` : ""}
                  </span>
                </div>
              )}
              <div className="mt-1 flex items-center justify-between border-t border-zinc-200 pt-2 text-base font-bold text-ink">
                <span>Estimated Total</span>
                <span>
                  {summaryTotal != null ? `$${summaryTotal.toFixed(2)}` : "TBD"}
                </span>
              </div>
            </div>
            <p className="mt-2 text-xs text-zinc-500">
              {materialQuote?.note ??
                "Doesn't include delivery mileage past 30 miles or a weight overage, if any — we'll confirm before your date."}
            </p>
          </div>

          {hasTiers && (
            <fieldset className="flex flex-col gap-2">
              <legend className="mb-1 text-sm font-semibold text-zinc-700">How long do you need it?</legend>
              <input type="hidden" name="tierId" value={tierId} />
              <div className="grid grid-cols-2 gap-2">
                {selectedCategory.pricingTiers.map((tier) => {
                  const selected = tier.id === tierId;
                  return (
                    <button
                      key={tier.id}
                      type="button"
                      aria-pressed={selected}
                      onClick={() => onTierChange(tier.id)}
                      className={`rounded-2xl border-2 p-3 text-left transition-colors ${
                        selected ? "border-brand bg-brand/10" : "border-zinc-200 hover:border-zinc-300"
                      }`}
                    >
                      <span className="block text-sm font-bold text-ink">{tier.label}</span>
                      <span className="block text-xl font-extrabold tracking-tight text-ink">
                        {tier.price != null ? `$${tier.price.toFixed(2)}` : "Call"}
                      </span>
                    </button>
                  );
                })}
              </div>
            </fieldset>
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
                    {materialQuote.isCustomQuote ? "Estimated total" : "Total (before mileage)"}: $
                    {materialQuote.total.toFixed(2)}
                  </p>
                  <p className="mt-1 text-xs text-zinc-500">{materialQuote.note}</p>
                  {!materialQuote.isCustomQuote && (
                    <p className="mt-1 text-xs text-zinc-500">
                      Deliveries beyond 30 miles of the yard add $3.50/mile — final total is
                      confirmed once you enter your delivery address below.
                    </p>
                  )}
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
              <Field label="Preferred delivery time" htmlFor="deliveryTime">
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
              <Field label="Preferred pickup time" htmlFor="pickupTime">
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
              <p className="col-span-2 -mt-2 text-xs text-zinc-500">
                We&apos;ll do our best to match your times and confirm them by phone or text.
              </p>
            </div>
          )}

          {isPending && (
            <p className="text-sm text-zinc-500">Checking availability…</p>
          )}
          {!isPending && availability.checked && (
            <p
              className={`text-sm font-medium ${
                availability.isAvailable ? "text-brand-fg" : "text-red-600"
              }`}
            >
              {availability.isAvailable
                ? "Available for your dates!"
                : "Not available for those dates — try different dates."}
            </p>
          )}

          <Field label="Your Name" htmlFor="name">
            <input id="name" name="name" required autoComplete="name" className={inputClass} />
          </Field>
          <Field label="Phone" htmlFor="phone">
            <input
              id="phone"
              name="phone"
              type="tel"
              required
              autoComplete="tel"
              className={inputClass}
            />
          </Field>
          <Field label="Email" htmlFor="email">
            <input
              id="email"
              name="email"
              type="email"
              required
              autoComplete="email"
              className={inputClass}
            />
          </Field>
          <Field label="Delivery Address" htmlFor="address">
            <input
              id="address"
              name="address"
              required
              autoComplete="street-address"
              className={inputClass}
              value={address}
              onChange={(e) => onAddressChange(e.target.value)}
            />
          </Field>

          <div>
            <h3 className="mb-1.5 font-display text-lg font-bold text-ink">
              Where should we place it?
            </h3>
            <PlacementMap
              value={placementPoint}
              rotation={placementRotation}
              onChange={onPlacementChange}
              onRotationChange={(degrees) => {
                placementTouchedRef.current = true;
                setPlacementRotation(degrees);
              }}
              center={geocodeCenter ?? undefined}
              footprint={
                selectedCategory
                  ? containerFootprint(selectedCategory)
                  : { lengthFt: 22, widthFt: 8, exact: false }
              }
            />
            <input type="hidden" name="placementLatitude" value={placementPoint?.lat ?? ""} />
            <input type="hidden" name="placementLongitude" value={placementPoint?.lng ?? ""} />
            <input
              type="hidden"
              name="placementRotation"
              value={placementPoint ? Math.round(placementRotation) : ""}
            />
          </div>

          <Field label="Anything else we should know? (optional)" htmlFor="notes">
            <textarea
              id="notes"
              name="notes"
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className={inputClass}
            />
            <div className="mt-1 flex flex-wrap gap-2" aria-label="Quick notes">
              {["Call when you arrive", "Gate code needed", "Steep driveway", "Dogs on site"].map((note) => (
                <button
                  key={note}
                  type="button"
                  onClick={() =>
                    setNotes((prev) =>
                      prev.includes(note) ? prev : `${prev.trimEnd()}${prev.trim() ? "\n" : ""}${note}`
                    )
                  }
                  className="min-h-9 rounded-full border border-zinc-300 bg-white px-3 text-xs font-semibold text-zinc-700 transition-colors hover:border-brand hover:bg-brand/10"
                >
                  + {note}
                </button>
              ))}
            </div>
          </Field>

          <Field label="Promo code (optional)" htmlFor="promoCode">
            <input
              id="promoCode"
              name="promoCode"
              placeholder="e.g. SAVE10"
              className={`${inputClass} uppercase`}
            />
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

          <div className="flex flex-col gap-3">
            <AgreementReader
              title={agreementTitle}
              content={agreementContent}
              active={step === "form"}
              onRead={() => setAgreementRead(true)}
            />
            <label className={`flex items-start gap-3 text-sm text-zinc-700 ${agreementRead ? "" : "opacity-60"}`}>
              <input
                type="checkbox"
                name="agreed"
                required
                checked={agreed}
                disabled={!agreementRead}
                onChange={(e) => setAgreed(e.target.checked)}
                className="mt-1 h-5 w-5 flex-shrink-0 rounded border-zinc-300"
              />
              I have read and agree to the terms above. Typing my name above and
              checking this box serves as my electronic signature.
            </label>
          </div>

          {submitError && (
            <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
              {submitError}
            </p>
          )}
          <button
            type="submit"
            disabled={isSubmitting || !bookable || !agreed || (availability.checked && !availability.isAvailable)}
            className="min-h-14 rounded-xl bg-accent px-5 text-lg font-extrabold text-accent-ink transition-all hover:brightness-105 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isSubmitting ? "Sending…" : "Request Booking"}
          </button>
          {!agreed && (
            <p className="text-xs text-zinc-500">
              Read to the end of the agreement and tick the box to send your request.
            </p>
          )}
          <p className="text-xs text-zinc-500">
            This sends a request — we&apos;ll contact you shortly to confirm
            details and payment.
          </p>
          <NextSteps contactPhone={contactPhone} />
        </div>
      )}
    </form>
  );
}
