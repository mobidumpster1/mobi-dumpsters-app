"use server";

import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { db } from "@/lib/db";
import { str } from "@/lib/formData";
import { findAvailableItems, effectiveCategoryId, requiredQuantity } from "@/lib/availability";
import { geocodeAddress } from "@/lib/geocode";
import { sendNotificationEmail, sendCustomerEmail } from "@/lib/email";
import { getAgreementSettings } from "@/lib/agreement";
import { savePhotoFile } from "@/lib/uploads";
import { branding } from "@/lib/branding";
import { fillBlankCustomerFields } from "@/lib/customerSync";
import { renderEmailTemplate } from "@/lib/emailTemplates";

export async function checkAvailability(
  categoryId: string,
  startDate: string,
  endDate: string
) {
  if (!categoryId || !startDate || !endDate) {
    return { availableCount: 0, isAvailable: false };
  }
  const category = await db.equipmentCategory.findUnique({ where: { id: categoryId } });
  if (!category) return { availableCount: 0, isAvailable: false };

  const items = await findAvailableItems(
    effectiveCategoryId(category),
    new Date(startDate),
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
  const category = await db.equipmentCategory.findUnique({ where: { id: categoryId } });
  if (!category) return [];

  const effectiveId = effectiveCategoryId(category);
  const needed = requiredQuantity(category);
  const days = Math.max(durationDays, 1);

  const monthStartDate = new Date(`${monthStart}T00:00:00.000Z`);
  const monthEndDate = new Date(monthStartDate);
  monthEndDate.setUTCMonth(monthEndDate.getUTCMonth() + 1);
  const queryEnd = new Date(monthEndDate);
  queryEnd.setUTCDate(queryEnd.getUTCDate() + days);

  const items = await db.equipmentItem.findMany({
    where: { categoryId: effectiveId, status: { notIn: ["retired", "needs_repair"] } },
    include: {
      bookingItems: {
        where: {
          actualReturnDate: null,
          startDate: { lt: queryEnd },
          expectedReturnDate: { gt: monthStartDate },
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

    if (freeCount < needed) {
      unavailable.push(dayStart.toISOString().slice(0, 10));
    }
  }
  return unavailable;
}

export async function submitBookingRequest(formData: FormData) {
  const categoryId = str(formData, "categoryId");
  const tierId = str(formData, "tierId");
  const startDateStr = str(formData, "startDate");
  const name = str(formData, "name");
  const phone = str(formData, "phone");
  const email = str(formData, "email");
  const address = str(formData, "address");
  const agreed = formData.get("agreed") === "on";

  if (!categoryId) throw new Error("Please choose what you'd like to rent");
  if (!startDateStr) throw new Error("Please choose a date");
  if (!name) throw new Error("Name is required");
  if (!phone) throw new Error("Phone is required");
  if (!email) throw new Error("Email is required");
  if (!address) throw new Error("Delivery address is required");
  if (!agreed) throw new Error("You must agree to the service agreement to book");

  const category = await db.equipmentCategory.findUniqueOrThrow({
    where: { id: categoryId },
    include: { pricingTiers: true },
  });

  const tier = tierId
    ? category.pricingTiers.find((t) => t.id === tierId)
    : undefined;
  if (tierId && !tier) throw new Error("Please choose a valid rental duration");
  if (tier && tier.price === null) {
    throw new Error("That duration requires a call for pricing — please call us instead.");
  }

  const startDate = new Date(startDateStr);
  const endDate = tier
    ? new Date(startDate.getTime() + tier.days * 86_400_000)
    : (() => {
        const endDateStr = str(formData, "endDate");
        if (!endDateStr) throw new Error("Please choose your dates");
        return new Date(endDateStr);
      })();

  const needed = requiredQuantity(category);
  const available = await findAvailableItems(
    effectiveCategoryId(category),
    startDate,
    endDate
  );
  if (available.length < needed) {
    throw new Error(
      "Sorry, nothing is available for those dates anymore. Please try different dates."
    );
  }
  const items = available.slice(0, needed);
  const totalPrice = tier ? (tier.price ?? 0) : (category.basePrice ?? 0);
  const pricePerItem = totalPrice / needed;

  let customer = await db.customer.findFirst({ where: { email } });
  if (!customer) {
    customer = await db.customer.findFirst({ where: { phone } });
  }
  if (!customer) {
    customer = await db.customer.create({ data: { name, phone, email, address } });
  } else {
    await fillBlankCustomerFields(customer, { phone, email, address });
  }

  const geocoded = await geocodeAddress(address);

  const booking = await db.booking.create({
    data: {
      customerId: customer.id,
      deliveryAddress: address,
      latitude: geocoded?.latitude,
      longitude: geocoded?.longitude,
      status: "pending",
      notes: str(formData, "notes"),
      items: {
        create: items.map((item) => ({
          equipmentItemId: item.id,
          startDate,
          expectedReturnDate: endDate,
          price: pricePerItem,
        })),
      },
    },
  });

  const photoFiles = formData
    .getAll("photos")
    .filter((f): f is File => f instanceof File && f.size > 0);
  for (const file of photoFiles) {
    const filePath = await savePhotoFile(booking.id, file);
    await db.photo.create({
      data: { bookingId: booking.id, filePath, type: "other" },
    });
  }

  const agreement = await getAgreementSettings();
  const headerList = await headers();
  const ipAddress =
    headerList.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    headerList.get("x-real-ip") ??
    null;
  const signedAgreement = await db.signedAgreement.create({
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
  });

  // Hold these units so they don't look "Available" for other jobs while
  // the request is awaiting confirmation.
  await db.equipmentItem.updateMany({
    where: { id: { in: items.map((item) => item.id) } },
    data: {
      status: "reserved",
      currentCustomerId: customer.id,
      currentLocation: address,
    },
  });

  await sendNotificationEmail(
    `New booking request from ${name}`,
    [
      `${name} requested a ${category.name}${tier ? ` (${tier.label})` : ""} from ${startDateStr} to ${endDate.toISOString().slice(0, 10)}.`,
      "",
      `Address: ${address}`,
      `Phone: ${phone ?? "—"}`,
      `Email: ${email ?? "—"}`,
      "",
      "Open the app's Bookings page to review and confirm.",
    ].join("\n")
  );

  const host = headerList.get("host");
  const agreementUrl = host ? `https://${host}/agreement/view/${signedAgreement.id}` : null;
  try {
    const { subject, body } = await renderEmailTemplate("booking_confirmation", {
      customerName: name,
      categoryAndTier: `${category.name}${tier ? ` (${tier.label})` : ""}`,
      startDate: startDateStr,
      endDate: endDate.toISOString().slice(0, 10),
      address,
      agreementLine: agreementUrl
        ? `\nYou can view the service agreement you signed here: ${agreementUrl}\n`
        : "",
      phone: branding.phone,
      businessName: branding.businessName,
    });
    await sendCustomerEmail(email, subject, body);
  } catch (error) {
    console.error("Failed to send booking confirmation email:", error);
  }

  redirect(`/book/thank-you?ref=${booking.id.slice(-8)}`);
}
