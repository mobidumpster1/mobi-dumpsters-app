"use server";

import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { db } from "@/lib/db";
import { str } from "@/lib/formData";
import { findAvailableItems } from "@/lib/availability";
import { geocodeAddress } from "@/lib/geocode";
import { sendNotificationEmail } from "@/lib/email";
import { getAgreementSettings } from "@/lib/agreement";

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
  const startDateStr = str(formData, "startDate");
  const endDateStr = str(formData, "endDate");
  const name = str(formData, "name");
  const phone = str(formData, "phone");
  const email = str(formData, "email");
  const address = str(formData, "address");
  const agreed = formData.get("agreed") === "on";

  if (!categoryId) throw new Error("Please choose what you'd like to rent");
  if (!startDateStr || !endDateStr) throw new Error("Please choose your dates");
  if (!name) throw new Error("Name is required");
  if (!phone) throw new Error("Phone is required");
  if (!email) throw new Error("Email is required");
  if (!address) throw new Error("Delivery address is required");
  if (!agreed) throw new Error("You must agree to the service agreement to book");

  const startDate = new Date(startDateStr);
  const endDate = new Date(endDateStr);

  const available = await findAvailableItems(categoryId, startDate, endDate);
  if (available.length === 0) {
    throw new Error(
      "Sorry, nothing is available for those dates anymore. Please try different dates."
    );
  }
  const item = available[0];
  const category = await db.equipmentCategory.findUniqueOrThrow({
    where: { id: categoryId },
  });

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
          price: 0,
        },
      },
    },
  });

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
      `${name} requested a ${category.name} from ${startDateStr} to ${endDateStr}.`,
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
