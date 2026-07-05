"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { str } from "@/lib/formData";
import { geocodeAddress } from "@/lib/geocode";
import { pushBookingToCalendar } from "@/lib/googleCalendar";
import { createDraftInvoiceForBooking } from "@/lib/invoicing";

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
