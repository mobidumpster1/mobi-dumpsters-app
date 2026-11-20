"use server";

import { redirect } from "next/navigation";
import { notifyOwner } from "@/lib/orgContact";
import { headers, cookies } from "next/headers";
import { db } from "@/lib/db";
import { Prisma } from "@/generated/prisma";
import { str } from "@/lib/formData";
import { findAvailableItems, effectiveCategoryId, requiredQuantity } from "@/lib/availability";
import { geocodeAddress } from "@/lib/geocode";
import { sendCustomerEmail, siteOrigin } from "@/lib/email";
import { getAgreementSettings } from "@/lib/agreement";
import { savePhotoFile } from "@/lib/uploads";
import { branding } from "@/lib/branding";
import { getOrgBranding } from "@/lib/orgBranding";
import { fillBlankCustomerFields } from "@/lib/customerSync";
import { renderEmailTemplate } from "@/lib/emailTemplates";
import { mapUtmSourceToLeadSource } from "@/lib/leadSource";
import { resolveReferralCode } from "@/lib/referralCode";
import { getPublicOrganizationId } from "@/lib/session";
import { createDraftInvoiceForBooking } from "@/lib/invoicing";
import { createCheckoutSession, savePaymentMethodFromSetupIntent, toCents } from "@/lib/stripe";
import { quoteMaterialDelivery } from "@/lib/materialDelivery";
import { milesBetween, drivingMilesBetween } from "@/lib/distance";
import { validatePromoCode } from "@/lib/promoCodes";
import { computeSeasonalAdjustment } from "@/lib/pricingRules";
import { getBookingAvailabilitySettings } from "@/lib/bookingAvailabilitySettings";
import { listBlackoutDates, isDateBlackedOut, meetsMinimumNotice } from "@/lib/blackoutDates";
import { getOrgContact } from "@/lib/orgContact";

// Thin wrapper so the checkout placement map can preview where an in-progress
// address geocodes to, using the exact same lookup (and GA/US restriction)
// submitBookingRequest itself uses — never exposes GOOGLE_MAPS_API_KEY to
// the client.
export async function geocodePreview(address: string) {
  return geocodeAddress(address);
}

export async function checkAvailability(
  categoryId: string,
  startDate: string,
  endDate: string
) {
  if (!categoryId || !startDate || !endDate) {
    return { availableCount: 0, isAvailable: false };
  }
  const organizationId = await getPublicOrganizationId();
  const category = await db.equipmentCategory.findFirst({
    where: { id: categoryId, organizationId },
  });
  if (!category) return { availableCount: 0, isAvailable: false };

  const requestedStart = new Date(startDate);
  const [settings, blackoutRanges] = await Promise.all([
    getBookingAvailabilitySettings(organizationId),
    listBlackoutDates(organizationId),
  ]);
  if (
    isDateBlackedOut(requestedStart, blackoutRanges) ||
    !meetsMinimumNotice(requestedStart, settings.minimumNoticeHours)
  ) {
    return { availableCount: 0, isAvailable: false };
  }

  const items = await findAvailableItems(
    effectiveCategoryId(category),
    requestedStart,
    new Date(endDate)
  );
  const needed = requiredQuantity(category);
  return { availableCount: items.length, isAvailable: items.length >= needed };
}

// Returns which delivery-start dates in the given month are NOT bookable
// for a rental of `durationDays` length, so the calendar on /book can gray
// them out instead of letting the customer pick a date that will just fail
// the availability check afterward.
export async function getUnavailableStartDates(
  categoryId: string,
  monthStart: string, // "YYYY-MM-01"
  durationDays: number
): Promise<string[]> {
  if (!categoryId || !monthStart) return [];
  const organizationId = await getPublicOrganizationId();
  const category = await db.equipmentCategory.findFirst({
    where: { id: categoryId, organizationId },
  });
  if (!category) return [];

  const effectiveId = effectiveCategoryId(category);
  const needed = requiredQuantity(category);
  const days = Math.max(durationDays, 1);

  const [settings, blackoutRanges] = await Promise.all([
    getBookingAvailabilitySettings(organizationId),
    listBlackoutDates(organizationId),
  ]);

  const monthStartDate = new Date(`${monthStart}T00:00:00.000Z`);
  const monthEndDate = new Date(monthStartDate);
  monthEndDate.setUTCMonth(monthEndDate.getUTCMonth() + 1);
  const queryEnd = new Date(monthEndDate);
  queryEnd.setUTCDate(queryEnd.getUTCDate() + days);

  const items = await db.equipmentItem.findMany({
    where: {
      categoryId: effectiveId,
      organizationId,
      status: { notIn: ["retired", "needs_repair"] },
    },
    include: {
      // Same fix as findAvailableItems in src/lib/availability.ts — a
      // cancelled booking's BookingItem must not keep blocking its dates.
      bookingItems: {
        where: {
          actualReturnDate: null,
          startDate: { lt: queryEnd },
          expectedReturnDate: { gt: monthStartDate },
          booking: { status: { not: "cancelled" } },
        },
      },
    },
  });

  const unavailable: string[] = [];
  for (
    let d = new Date(monthStartDate);
    d < monthEndDate;
    d.setUTCDate(d.getUTCDate() + 1)
  ) {
    const dayStart = new Date(d);
    const dayEnd = new Date(d);
    dayEnd.setUTCDate(dayEnd.getUTCDate() + days);

    const freeCount = items.filter(
      (item) =>
        !item.bookingItems.some(
          (bi) => bi.startDate < dayEnd && bi.expectedReturnDate > dayStart
        )
    ).length;

    const blocked =
      freeCount < needed ||
      isDateBlackedOut(dayStart, blackoutRanges) ||
      !meetsMinimumNotice(dayStart, settings.minimumNoticeHours);

    if (blocked) {
      unavailable.push(dayStart.toISOString().slice(0, 10));
    }
  }
  return unavailable;
}

function addDays(dateStr: string, days: number) {
  const date = new Date(`${dateStr}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

// A problem the customer can understand and fix (bad date, sold out, bad
// promo code...). submitBookingRequest turns these into an on-page message;
// anything else becomes a generic one, so raw database/internal errors are
// never shown to a customer.
class BookingError extends Error {}

// Runs one post-booking step without letting a failure escape (see the
// comment at the call sites in processBookingRequest).
async function afterCommit<T>(step: string, fn: () => Promise<T>): Promise<T | undefined> {
  try {
    return await fn();
  } catch (error) {
    console.error(`Booking was saved, but "${step}" failed:`, error);
    return undefined;
  }
}

// Returns an error for the form to display instead of throwing — a thrown
// error from a server action becomes Next's generic "Application error"
// page (the real message is masked in production), which dumped customers
// out of the form, inside the owner's own website's iframe, with everything
// they'd typed gone. redirect() has to stay out here, outside the try: it
// works by throwing internally.
export async function submitBookingRequest(formData: FormData): Promise<{ error: string } | undefined> {
  let redirectTo: string;
  try {
    redirectTo = await processBookingRequest(formData);
  } catch (error) {
    if (error instanceof BookingError) return { error: error.message };
    console.error("Booking request failed unexpectedly:", error);
    return {
      error:
        "Something went wrong on our end, so your request wasn't submitted. Please try again, or call us to book.",
    };
  }
  redirect(redirectTo);
}

async function processBookingRequest(formData: FormData): Promise<string> {
  const categoryId = str(formData, "categoryId");
  const tierId = str(formData, "tierId");
  const materialOptionId = str(formData, "materialOptionId");
  const materialQuantity = Number(str(formData, "materialQuantity")) || 0;
  const startDateStr = str(formData, "startDate");
  const deliveryTime = str(formData, "deliveryTime") || "09:00";
  const pickupTime = str(formData, "pickupTime") || "09:00";
  const name = str(formData, "name");
  const phone = str(formData, "phone");
  const email = str(formData, "email");
  const address = str(formData, "address");
  const placementLatitudeStr = str(formData, "placementLatitude");
  const placementLongitudeStr = str(formData, "placementLongitude");
  const placementLatitude = placementLatitudeStr && Number.isFinite(Number(placementLatitudeStr)) ? Number(placementLatitudeStr) : null;
  const placementLongitude = placementLongitudeStr && Number.isFinite(Number(placementLongitudeStr)) ? Number(placementLongitudeStr) : null;
  const placementRotationStr = str(formData, "placementRotation");
  // Only meaningful alongside a placement point; wrapped into 0-359 so a
  // tampered value can't store anything odd.
  const placementRotation =
    placementLatitude !== null && placementLongitude !== null && placementRotationStr && Number.isFinite(Number(placementRotationStr))
      ? ((Number(placementRotationStr) % 360) + 360) % 360
      : null;
  const agreed = formData.get("agreed") === "on";
  const isEmbed = formData.get("embed") === "1";

  if (!categoryId) throw new BookingError("Please choose what you'd like to rent");
  if (!startDateStr) throw new BookingError("Please choose a date");
  if (!name) throw new BookingError("Name is required");
  if (!phone) throw new BookingError("Phone is required");
  if (!email) throw new BookingError("Email is required");
  if (!address) throw new BookingError("Delivery address is required");
  if (!agreed) throw new BookingError("You must agree to the service agreement to book");

  const organizationId = await getPublicOrganizationId();
  const category = await db.equipmentCategory.findFirstOrThrow({
    where: { id: categoryId, organizationId },
    include: { pricingTiers: true, materialOptions: true },
  });

  const tier = tierId
    ? category.pricingTiers.find((t) => t.id === tierId)
    : undefined;
  if (tierId && !tier) throw new BookingError("Please choose a valid rental duration");
  if (tier && tier.price === null) {
    throw new BookingError("That duration requires a call for pricing — please call us instead.");
  }

  // Geocoded here (rather than down by the booking's own lat/lng) so a
  // material delivery quote can factor in the real one-way distance from
  // the yard, per the $3.50/mile-beyond-30 rule in the service agreement.
  // Real driving distance (not straight-line) since this number directly
  // sets a mileage charge — falls back to straight-line if the Routes API
  // call fails for any reason, rather than blocking the booking on it.
  const geocoded = await geocodeAddress(address);
  const oneWayMiles = geocoded
    ? ((await drivingMilesBetween(
        branding.yardLatitude,
        branding.yardLongitude,
        geocoded.latitude,
        geocoded.longitude
      )) ??
      milesBetween(branding.yardLatitude, branding.yardLongitude, geocoded.latitude, geocoded.longitude))
    : null;

  // Categories priced by material + quantity (e.g. Material Delivery)
  // instead of a flat base price or duration tier — recomputed here from
  // the material's real per-unit price rather than trusting anything the
  // client sent, same as tier pricing above.
  const material =
    category.materialOptions.length > 0
      ? category.materialOptions.find((m) => m.id === materialOptionId)
      : undefined;
  if (category.materialOptions.length > 0) {
    if (!material) throw new BookingError("Please choose a material");
    if (!(materialQuantity > 0)) throw new BookingError("Please enter a quantity");
  }
  const materialQuote = material
    ? quoteMaterialDelivery(material.pricePerUnit, materialQuantity, material.unit, oneWayMiles)
    : null;

  // Rentals (has a tier): pickup is computed from the delivery date plus
  // the tier's duration, at whatever pickup time was requested. One-time
  // service jobs (no tier, e.g. junk removal/demolition) don't have a
  // separate pickup — Chase is on-site the whole time — so both ends land
  // on the same day.
  // Explicit "Z" so the digits the customer picked are stored as-is,
  // matching addDays's own T00:00:00.000Z convention above (and
  // dumpSchedule.ts's documented one: this app treats stored UTC digits
  // as the business's own local wall-clock time throughout, since there's
  // no real per-org timezone field). Without it, this was the one place
  // in the app where a date got parsed against whatever timezone the
  // server process happens to be running in instead — on Vercel that's
  // UTC, silently shifting every stored delivery/pickup time by several
  // hours from what was actually selected.
  const startDate = new Date(`${startDateStr}T${deliveryTime}Z`);
  const endDate = tier
    ? new Date(`${addDays(startDateStr, tier.days)}T${pickupTime}Z`)
    : new Date(`${startDateStr}T${deliveryTime}Z`);

  const [bookingAvailabilitySettings, blackoutRanges] = await Promise.all([
    getBookingAvailabilitySettings(organizationId),
    listBlackoutDates(organizationId),
  ]);
  if (bookingAvailabilitySettings.awayModeEnabled) {
    throw new BookingError(bookingAvailabilitySettings.awayModeMessage);
  }
  if (isDateBlackedOut(startDate, blackoutRanges)) {
    throw new BookingError("Sorry, we're not delivering on that date. Please try a different date.");
  }
  if (!meetsMinimumNotice(startDate, bookingAvailabilitySettings.minimumNoticeHours)) {
    throw new BookingError(
      `Sorry, deliveries need at least ${bookingAvailabilitySettings.minimumNoticeHours} hours' notice. Please choose a later date or call us.`
    );
  }

  const needed = requiredQuantity(category);
  const available = await findAvailableItems(
    effectiveCategoryId(category),
    startDate,
    endDate
  );
  if (available.length < needed) {
    throw new BookingError(
      "Sorry, nothing is available for those dates anymore. Please try different dates."
    );
  }
  const items = available.slice(0, needed);
  const basePrice = materialQuote
    ? materialQuote.total
    : tier
      ? (tier.price ?? 0)
      : (category.basePrice ?? 0);

  // Weekend/seasonal surcharges (see pricingRules.ts) apply before the
  // promo code discount, same order a customer would expect: the code
  // discounts the actual price they'd pay, surcharge included.
  const seasonalAdjustment = await computeSeasonalAdjustment(
    organizationId,
    effectiveCategoryId(category),
    startDate,
    basePrice
  );
  const listPrice = basePrice + seasonalAdjustment.amount;

  const promoCodeInput = str(formData, "promoCode");
  let totalPrice = listPrice;
  let appliedPromoCodeId: string | null = null;
  let discountAmount: number | null = null;
  let discountNote: string | null = null;
  if (promoCodeInput) {
    const check = await validatePromoCode(organizationId, promoCodeInput, listPrice, [
      effectiveCategoryId(category),
    ]);
    if (!check.ok) throw new BookingError(check.error);
    totalPrice = listPrice - check.amountOff;
    appliedPromoCodeId = check.promoCode.id;
    discountAmount = check.amountOff;
    discountNote = `Promo: ${check.promoCode.code}`;
  }
  const pricePerItem = totalPrice / needed;
  const seasonalItemNote =
    seasonalAdjustment.noteLines.length > 0 ? seasonalAdjustment.noteLines.join(", ") : null;
  const materialItemNote =
    material && materialQuote
      ? `${materialQuantity} ${material.unit} ${material.name} @ $${material.pricePerUnit.toFixed(2)}/${material.unit}` +
        (materialQuote.isCustomQuote
          ? " (custom quote, price pending confirmation)"
          : ` + $${materialQuote.deliveryFee.toFixed(2)} delivery` +
            (materialQuote.mileageFee > 0
              ? ` (incl. $${materialQuote.mileageFee.toFixed(2)} mileage, ${oneWayMiles?.toFixed(1)} mi one-way)`
              : ""))
      : null;

  let customer = await db.customer.findFirst({ where: { email, organizationId } });
  if (!customer) {
    customer = await db.customer.findFirst({ where: { phone, organizationId } });
  }
  if (!customer) {
    // Only set on a genuinely new customer — an existing customer's
    // original source stays whatever it was, even if this particular
    // booking happened to come from a different ad click.
    const utmSource = (await cookies()).get("mobi_utm_source")?.value;
    const referralCodeCookie = (await cookies()).get("mobi_referral_code")?.value;
    // Referral tracking is a Pro-plan feature — a Team/Solo org's
    // customers just fall back to the UTM-derived source, same as if no
    // ?ref= link was ever clicked.
    const org = await db.organization.findUnique({
      where: { id: organizationId },
      select: { plan: true },
    });
    const referrer =
      referralCodeCookie && org?.plan === "pro"
        ? await resolveReferralCode(organizationId, referralCodeCookie)
        : null;
    customer = await db.customer.create({
      data: {
        organizationId,
        name,
        phone,
        email,
        address,
        // An actual referral is a stronger signal than ad-click
        // attribution, so it wins over whatever the UTM cookie says.
        leadSource: referrer ? "referral" : mapUtmSourceToLeadSource(utmSource),
        referredByCustomerId: referrer?.id,
      },
    });
  } else {
    await fillBlankCustomerFields(customer, { phone, email, address });
  }
  // Captured once, definitely non-null, so the closure below doesn't lose
  // the narrowing TypeScript already proved above (a `let` reassigned in
  // an if/else isn't narrowed inside a nested function that merely
  // *could* run after further reassignment, even though this one won't;
  // same for `address`, a plain `const` — the required-field guard above
  // narrows it at the top level, but that narrowing isn't carried into a
  // nested async closure either).
  const customerId = customer.id;
  const deliveryAddress: string = address;

  // The plain findAvailableItems check above (used to pick `items`) reads
  // and the booking write below happen far enough apart — pricing, promo
  // validation, customer lookup/create — that two requests for the last
  // unit of a category can both pass that read and then both write,
  // double-booking one physical unit. Re-checking and creating inside one
  // Serializable transaction closes that: Postgres itself detects when a
  // concurrent transaction's write would invalidate this one's read of
  // availability, and aborts one side with a P2034 conflict rather than
  // letting both through. A single retry is the standard recommended
  // response to P2034 (transient by nature — the retry's fresh read
  // reflects the other transaction's now-committed reservation).
  async function reserveAndCreateBooking() {
    return db.$transaction(
      async (tx) => {
        const stillAvailable = await findAvailableItems(
          effectiveCategoryId(category),
          startDate,
          endDate,
          tx
        );
        if (stillAvailable.length < needed) {
          throw new BookingError(
            "Sorry, nothing is available for those dates anymore. Please try different dates."
          );
        }
        const reservedItems = stillAvailable.slice(0, needed);

        // Same race as equipment availability, same fix: validatePromoCode's
        // earlier check and the redemption increment used to happen far
        // apart (separated by all of this pricing/customer/availability
        // work), so two checkouts racing for the last use of a max-1 code
        // could both pass the check and both increment — confirmed live,
        // over-redeeming a max-1 code to 2. Re-checking the cap here, in
        // the same Serializable transaction as the booking write, closes
        // it the same way T019's fix did.
        if (appliedPromoCodeId) {
          const promo = await tx.promoCode.findUniqueOrThrow({ where: { id: appliedPromoCodeId } });
          if (promo.maxRedemptions !== null && promo.redemptionCount >= promo.maxRedemptions) {
            throw new BookingError("Sorry, that promo code was just fully redeemed. Please remove it and try again.");
          }
          await tx.promoCode.update({
            where: { id: appliedPromoCodeId },
            data: { redemptionCount: { increment: 1 } },
          });
        }

        return tx.booking.create({
          include: { items: true },
          data: {
            organizationId,
            customerId,
            deliveryAddress,
            latitude: geocoded?.latitude,
            longitude: geocoded?.longitude,
            placementLatitude,
            placementLongitude,
            placementRotation,
            status: "pending",
            notes: str(formData, "notes"),
            promoCodeId: appliedPromoCodeId,
            discountAmount,
            discountNote,
            items: {
              create: reservedItems.map((item) => ({
                equipmentItemId: item.id,
                startDate,
                expectedReturnDate: endDate,
                price: pricePerItem,
                notes: [materialItemNote, seasonalItemNote].filter(Boolean).join(" — ") || null,
              })),
            },
          },
        });
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }
    );
  }

  let booking;
  try {
    booking = await reserveAndCreateBooking();
  } catch (error) {
    const isConflict = error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2034";
    if (!isConflict) throw error;
    booking = await reserveAndCreateBooking();
  }

  // Computed with the same pricing rules staff would get from the
  // "Create Invoice" button — created now (not just on confirmation) so a
  // customer choosing to pay online right away (see payBookingInvoiceNow
  // below) has a real amount to pay against immediately, without waiting
  // on Chase to review the request first.
  //
  // Everything from here on runs after the booking is already saved and the
  // unit reserved, so none of it may throw out to the customer — that would
  // show an error page for a request that actually went through, and a retry
  // would then hit "sold out" on their own unit or create a duplicate. Each
  // step is isolated (afterCommit) so one failing never blocks the rest or
  // the thank-you page; the pending booking is still on the owner's
  // dashboard either way.
  const invoice = await afterCommit("create invoice", () => createDraftInvoiceForBooking(booking.id));

  const photoFiles = formData
    .getAll("photos")
    .filter((f): f is File => f instanceof File && f.size > 0);
  for (const file of photoFiles) {
    await afterCommit("save photo", async () => {
      const filePath = await savePhotoFile(booking.id, file);
      await db.photo.create({
        data: { bookingId: booking.id, filePath, type: "other" },
      });
    });
  }

  const agreement = await getAgreementSettings(organizationId);
  const headerList = await headers();
  const ipAddress =
    headerList.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    headerList.get("x-real-ip") ??
    null;
  const signedAgreement = await afterCommit("record signed agreement", () =>
    db.signedAgreement.create({
      data: {
        agreementTitle: agreement.title,
        agreementText: agreement.content,
        signerName: name,
        signerEmail: email,
        signerPhone: phone,
        signerAddress: address,
        ipAddress,
        customerId: customer.id,
        bookingId: booking.id,
      },
    })
  );

  // Hold these units so they don't look "Available" for other jobs while
  // the request is awaiting confirmation. Reads the actual reserved items
  // off the created booking, not the pre-transaction `items` list above —
  // the transaction's own re-check is the source of truth for which units
  // were really reserved (see reserveAndCreateBooking).
  await afterCommit("mark equipment reserved", () =>
    db.equipmentItem.updateMany({
      where: { id: { in: booking.items.map((item) => item.equipmentItemId) }, organizationId },
      data: {
        status: "reserved",
        currentCustomerId: customer.id,
        currentLocation: address,
      },
    })
  );

  await afterCommit("notify owner", () => notifyOwner(
    organizationId,
    `New booking request from ${name}`,
    [
      tier
        ? `${name} requested a ${category.name} (${tier.label}) — delivery ${startDateStr} at ${deliveryTime}, pickup ${addDays(startDateStr, tier.days)} at ${pickupTime}.`
        : materialItemNote
          ? `${name} requested ${category.name}: ${materialItemNote} — total $${totalPrice.toFixed(2)} — delivery ${startDateStr} at ${deliveryTime}.`
          : `${name} requested a ${category.name} — ${startDateStr} at ${deliveryTime}.`,
      "",
      `Address: ${address}`,
      `Phone: ${phone ?? "—"}`,
      `Email: ${email ?? "—"}`,
      "",
      "Open the app's Bookings page to review and confirm.",
    ].join("\n")
  ));

  const host = headerList.get("host");
  const agreementUrl = host && signedAgreement ? `https://${host}/agreement/view/${signedAgreement.id}` : null;
  try {
    const orgBranding = await getOrgBranding(organizationId);
    const { subject, body } = await renderEmailTemplate(
      "booking_confirmation",
      {
        customerName: name,
        categoryAndTier: `${category.name}${tier ? ` (${tier.label})` : materialItemNote ? ` (${materialItemNote})` : ""}`,
        startDate: startDateStr,
        endDate: endDate.toISOString().slice(0, 10),
        address,
        agreementLine: agreementUrl
          ? `\nYou can view the service agreement you signed here: ${agreementUrl}\n`
          : "",
        phone: (await getOrgContact(organizationId)).phone,
        businessName: orgBranding.businessName,
      },
      organizationId
    );
    await sendCustomerEmail(email, subject, body, undefined, organizationId, { untracked: true });
  } catch (error) {
    console.error("Failed to send booking confirmation email:", error);
  }

  const params = new URLSearchParams({ ref: booking.id.slice(-8) });
  if (signedAgreement) params.set("agreement", signedAgreement.id);
  if (invoice) params.set("invoice", invoice.id);
  if (isEmbed) params.set("embed", "1");
  return `/book/thank-you?${params.toString()}`;
}

// Public, unauthenticated — a customer clicking "Pay Now" on the thank-you
// page right after booking, before Chase has confirmed anything. Sends
// them to a Stripe-hosted Checkout page (setup_future_usage means paying
// also saves their card for next time, backfilling one if they skipped
// the card step during booking). On any failure (Stripe not connected, no
// email on file, etc.) it sends them back to the thank-you page with
// payError=1 instead of throwing, so a customer never sees a raw crash
// page — see book/thank-you/page.tsx for the fallback message. The single
// redirect() call has to happen outside the try/catch: redirect() works
// by throwing internally, and catching that alongside real errors would
// break it.
export async function payBookingInvoiceNow(invoiceId: string) {
  let redirectTo: string;

  try {
    // Scoped to the requesting hostname's organization — invoiceId is a
    // bare, client-supplied value with no session behind it, so an
    // unscoped lookup would let this be called against any tenant's
    // invoice given only its ID.
    const organizationId = await getPublicOrganizationId();
    const invoice = await db.invoice.findFirstOrThrow({
      where: { id: invoiceId, organizationId },
      include: {
        booking: { include: { customer: true } },
        customer: true,
      },
    });

    const customer = invoice.booking?.customer ?? invoice.customer;
    if (!customer?.email) {
      throw new BookingError("No email on file for this booking.");
    }

    const result = await createCheckoutSession(
      invoice.organizationId,
      {
        id: customer.id,
        name: customer.name,
        email: customer.email,
        stripeCustomerId: customer.stripeCustomerId,
      },
      toCents(invoice.amount),
      invoice.booking ? `Booking ${invoice.invoiceNumber}` : `Invoice ${invoice.invoiceNumber}`,
      `${siteOrigin()}/book/thank-you?invoice=${invoiceId}&paid=1`,
      `${siteOrigin()}/book/thank-you?invoice=${invoiceId}`,
      { invoiceId: invoice.id }
    );

    if (!result) {
      throw new BookingError("Stripe isn't connected for this business.");
    }

    redirectTo = result.url;
  } catch (error) {
    console.error("payBookingInvoiceNow failed:", error);
    redirectTo = `/book/thank-you?invoice=${invoiceId}&payError=1`;
  }

  redirect(redirectTo);
}

// Public, unauthenticated — called directly from the StripeCardForm client
// component on the thank-you page once Stripe confirms the card, so the
// card's reference gets saved right away instead of waiting on the
// webhook alone. organizationId is derived from the invoice rather than
// trusted from the client, same reasoning as payBookingInvoiceNow above.
export async function confirmCardSetup(invoiceId: string, setupIntentId: string) {
  // Same scoping reasoning as payBookingInvoiceNow above. A mismatch here
  // (wrong org for this hostname) is treated as a silent no-op rather than
  // thrown to the client — the setup_intent.succeeded webhook is already
  // the documented backstop for saving the card, so nothing is lost.
  const organizationId = await getPublicOrganizationId();
  const invoice = await db.invoice.findFirst({ where: { id: invoiceId, organizationId } });
  if (!invoice) return;
  await savePaymentMethodFromSetupIntent(invoice.organizationId, setupIntentId);
}
