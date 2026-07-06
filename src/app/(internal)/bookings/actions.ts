"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { unlink } from "fs/promises";
import path from "path";
import { db } from "@/lib/db";
import { str } from "@/lib/formData";
import { geocodeAddress } from "@/lib/geocode";
import { pushBookingToCalendar } from "@/lib/googleCalendar";
import { createDraftInvoiceForBooking } from "@/lib/invoicing";
import { uploadsRoot } from "@/lib/uploads";
import { sendCustomerEmail } from "@/lib/email";
import { branding } from "@/lib/branding";

type BookingItemInput = {
  equipmentItemId: string;
  startDate: string;
  expectedReturnDate: string;
  price: string;
};

export async function createBooking(formData: FormData) {
  const customerId = str(formData, "customerId");
  const deliveryAddress = str(formData, "deliveryAddress");
  if (!customerId) throw new Error("Customer is required");
  if (!deliveryAddress) throw new Error("Delivery address is required");

  const itemsJson = formData.get("bookingItemsJson");
  const items: BookingItemInput[] =
    typeof itemsJson === "string" ? JSON.parse(itemsJson) : [];
  const validItems = items.filter(
    (item) => item.equipmentItemId && item.startDate && item.expectedReturnDate
  );

  if (validItems.length === 0) {
    throw new Error("At least one equipment item is required");
  }

  const geocoded = await geocodeAddress(deliveryAddress);

  const booking = await db.booking.create({
    data: {
      customerId,
      deliveryAddress,
      latitude: geocoded?.latitude,
      longitude: geocoded?.longitude,
      notes: str(formData, "notes"),
      status: "confirmed",
      items: {
        create: validItems.map((item) => ({
          equipmentItemId: item.equipmentItemId,
          startDate: new Date(item.startDate),
          expectedReturnDate: new Date(item.expectedReturnDate),
          price: Number(item.price) || 0,
        })),
      },
    },
    include: { customer: true, items: { include: { equipmentItem: true } } },
  });

  await db.equipmentItem.updateMany({
    where: { id: { in: validItems.map((i) => i.equipmentItemId) } },
    data: {
      status: "reserved",
      currentCustomerId: customerId,
      currentLocation: deliveryAddress,
    },
  });

  const calendarEventId = await pushBookingToCalendar({
    customerName: booking.customer.name,
    deliveryAddress: booking.deliveryAddress,
    notes: booking.notes,
    items: booking.items.map((item) => ({
      label: item.equipmentItem.label,
      startDate: item.startDate,
      expectedReturnDate: item.expectedReturnDate,
      price: item.price,
    })),
  });

  if (calendarEventId) {
    await db.booking.update({
      where: { id: booking.id },
      data: { googleCalendarEventId: calendarEventId },
    });
  }

  redirect(`/bookings/${booking.id}`);
}

export async function confirmBooking(bookingId: string, formData: FormData) {
  const booking = await db.booking.findUniqueOrThrow({
    where: { id: bookingId },
    include: { customer: true, items: { include: { equipmentItem: true } } },
  });

  for (const item of booking.items) {
    const priceStr = formData.get(`price_${item.id}`);
    const price = typeof priceStr === "string" ? Number(priceStr) || 0 : item.price;
    await db.bookingItem.update({ where: { id: item.id }, data: { price } });
  }

  await db.booking.update({ where: { id: bookingId }, data: { status: "confirmed" } });

  if (!booking.googleCalendarEventId) {
    const calendarEventId = await pushBookingToCalendar({
      customerName: booking.customer.name,
      deliveryAddress: booking.deliveryAddress,
      notes: booking.notes,
      items: booking.items.map((item) => ({
        label: item.equipmentItem.label,
        startDate: item.startDate,
        expectedReturnDate: item.expectedReturnDate,
        price: item.price,
      })),
    });
    if (calendarEventId) {
      await db.booking.update({
        where: { id: bookingId },
        data: { googleCalendarEventId: calendarEventId },
      });
    }
  }

  revalidatePath(`/bookings/${bookingId}`);
  revalidatePath("/bookings");
  revalidatePath("/");
}

export async function declineBooking(bookingId: string) {
  const booking = await db.booking.findUniqueOrThrow({
    where: { id: bookingId },
    include: { items: true },
  });

  await db.booking.update({ where: { id: bookingId }, data: { status: "cancelled" } });

  await db.equipmentItem.updateMany({
    where: { id: { in: booking.items.map((item) => item.equipmentItemId) } },
    data: { status: "available", currentCustomerId: null, currentLocation: null },
  });

  revalidatePath(`/bookings/${bookingId}`);
  revalidatePath("/bookings");
  revalidatePath("/");
}

export async function updateBooking(bookingId: string, formData: FormData) {
  const deliveryAddress = str(formData, "deliveryAddress");
  if (!deliveryAddress) throw new Error("Delivery address is required");

  const booking = await db.booking.findUniqueOrThrow({
    where: { id: bookingId },
    include: { items: true },
  });

  const geocoded =
    deliveryAddress !== booking.deliveryAddress
      ? await geocodeAddress(deliveryAddress)
      : null;

  await db.booking.update({
    where: { id: bookingId },
    data: {
      deliveryAddress,
      notes: str(formData, "notes"),
      ...(geocoded
        ? { latitude: geocoded.latitude, longitude: geocoded.longitude }
        : {}),
    },
  });

  for (const item of booking.items) {
    const startDate = str(formData, `startDate_${item.id}`);
    const expectedReturnDate = str(formData, `expectedReturnDate_${item.id}`);
    const priceStr = str(formData, `price_${item.id}`);
    await db.bookingItem.update({
      where: { id: item.id },
      data: {
        ...(startDate ? { startDate: new Date(startDate) } : {}),
        ...(expectedReturnDate
          ? { expectedReturnDate: new Date(expectedReturnDate) }
          : {}),
        price: priceStr ? Number(priceStr) || 0 : item.price,
      },
    });
  }

  revalidatePath(`/bookings/${bookingId}`);
  revalidatePath("/bookings");
  redirect(`/bookings/${bookingId}`);
}

export async function deleteBooking(bookingId: string) {
  const booking = await db.booking.findUniqueOrThrow({
    where: { id: bookingId },
    include: { items: true, invoices: true, photos: true },
  });

  if (booking.invoices.length > 0) {
    throw new Error(
      "This booking has an invoice. Delete the invoice first, then delete the booking."
    );
  }

  await db.equipmentItem.updateMany({
    where: {
      id: { in: booking.items.map((item) => item.equipmentItemId) },
      currentCustomerId: booking.customerId,
    },
    data: { status: "available", currentCustomerId: null, currentLocation: null },
  });

  for (const photo of booking.photos) {
    await unlink(path.join(uploadsRoot(), photo.filePath)).catch(() => {});
  }
  await db.photo.deleteMany({ where: { bookingId } });
  await db.expense.updateMany({ where: { bookingId }, data: { bookingId: null } });
  await db.bookingItem.deleteMany({ where: { bookingId } });
  await db.booking.delete({ where: { id: bookingId } });

  revalidatePath("/bookings");
  revalidatePath("/");
  revalidatePath("/equipment");
  redirect("/bookings");
}

export async function notifyOnTheWay(bookingId: string) {
  const booking = await db.booking.findUniqueOrThrow({
    where: { id: bookingId },
    include: { customer: true },
  });

  if (!booking.customer.email) {
    throw new Error("This customer has no email on file — add one to their profile first.");
  }

  await sendCustomerEmail(
    booking.customer.email,
    `${branding.businessName} is on the way!`,
    [
      `Hi ${booking.customer.name},`,
      "",
      `We're on our way to ${booking.deliveryAddress}.`,
      "",
      `Questions? Call or text us at ${branding.phone}.`,
      "",
      `- ${branding.businessName}`,
    ].join("\n")
  );

  redirect(`/bookings/${bookingId}?notified=1`);
}

export async function markDelivered(bookingItemId: string) {
  const bookingItem = await db.bookingItem.update({
    where: { id: bookingItemId },
    data: { deliveredAt: new Date() },
    include: { booking: true },
  });

  await db.equipmentItem.update({
    where: { id: bookingItem.equipmentItemId },
    data: { status: "out_on_job" },
  });

  // Close out whatever location event was open (e.g. sitting at the yard)
  // and open a new one for this job site.
  await db.equipmentLocationEvent.updateMany({
    where: { equipmentItemId: bookingItem.equipmentItemId, endedAt: null },
    data: { endedAt: new Date() },
  });
  await db.equipmentLocationEvent.create({
    data: {
      equipmentItemId: bookingItem.equipmentItemId,
      location: bookingItem.booking.deliveryAddress,
      customerId: bookingItem.booking.customerId,
    },
  });

  revalidatePath(`/bookings/${bookingItem.bookingId}`);
  revalidatePath("/");
  revalidatePath("/equipment");
}

export async function markReturned(bookingItemId: string, formData: FormData) {
  const actualTonnageStr = str(formData, "actualTonnage");
  const actualMileageStr = str(formData, "actualMileage");
  const vehicleId = str(formData, "vehicleId");

  const bookingItem = await db.bookingItem.update({
    where: { id: bookingItemId },
    data: {
      actualReturnDate: new Date(),
      pickedUpAt: new Date(),
      actualTonnage: actualTonnageStr ? Number(actualTonnageStr) : null,
      actualMileage: actualMileageStr ? Number(actualMileageStr) : null,
    },
  });

  await db.equipmentItem.update({
    where: { id: bookingItem.equipmentItemId },
    data: {
      status: "available",
      currentCustomerId: null,
      currentLocation: null,
    },
  });

  await db.equipmentLocationEvent.updateMany({
    where: { equipmentItemId: bookingItem.equipmentItemId, endedAt: null },
    data: { endedAt: new Date() },
  });
  await db.equipmentLocationEvent.create({
    data: { equipmentItemId: bookingItem.equipmentItemId, location: "Yard" },
  });

  // Feed the mileage log from the same field used for overage billing, so
  // staff aren't entering the same trip mileage twice.
  if (bookingItem.actualMileage) {
    await db.mileageLogEntry.create({
      data: {
        vehicleId: vehicleId || null,
        equipmentItemId: vehicleId ? null : bookingItem.equipmentItemId,
        bookingId: bookingItem.bookingId,
        date: new Date(),
        miles: bookingItem.actualMileage,
        purpose: "Job round trip",
        source: "manual",
      },
    });
  }

  // If every item on this booking is now back, the job is complete —
  // auto-generate a draft invoice (skipped if one already exists).
  const remaining = await db.bookingItem.count({
    where: { bookingId: bookingItem.bookingId, actualReturnDate: null },
  });
  if (remaining === 0) {
    await createDraftInvoiceForBooking(bookingItem.bookingId);
  }

  revalidatePath(`/bookings/${bookingItem.bookingId}`);
  revalidatePath("/");
  revalidatePath("/equipment");
  revalidatePath("/invoices");
}
