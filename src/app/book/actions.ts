"use server";

import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { db } from "@/lib/db";
import { str } from "@/lib/formData";
import { findAvailableItems } from "@/lib/availability";
import { geocodeAddress } from "@/lib/geocode";
import { sendNotificationEmail } from "@/lib/email";
import { getAgreementSettings } from "@/lib/agreement";
import { savePhotoFile } from "@/lib/uploads";

export async function checkAvailability(
  categoryId: string,
  startDate: string,
  endDate: string
) {
  if (!categoryId || !startDate || !endDate) return { availableCount: 0 };
  const items = await findAvailableItems(
    categoryId,
    new Date(startDate),
    new Date(endDate)
  );
  return { availableCount: items.length };
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

  const available = await findAvailableItems(categoryId, startDate, endDate);
  if (available.length === 0) {
    throw new Error(
      "Sorry, nothing is available for those dates anymore. Please try different dates."
    );
  }
  const item = available[0];
  const price = tier ? (tier.price ?? 0) : (category.basePrice ?? 0);

  let customer = await db.customer.findFirst({ where: { email } });
  if (!customer) {
    customer = await db.customer.findFirst({ where: { phone } });
  }
  if (!customer) {
    customer = await db.customer.create({ data: { name, phone, email, address } });
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
        create: {
          equipmentItemId: item.id,
          startDate,
          expectedReturnDate: endDate,
          price,
        },
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
  await db.signedAgreement.create({
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

  // Hold this unit so it doesn't look "Available" for other jobs while the
  // request is awaiting confirmation.
  await db.equipmentItem.update({
    where: { id: item.id },
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

  redirect(`/book/thank-you?ref=${booking.id.slice(-8)}`);
}
