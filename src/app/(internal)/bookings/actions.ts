"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { db } from "@/lib/db";
import { str } from "@/lib/formData";
import { geocodeAddress } from "@/lib/geocode";
import { pushBookingToCalendar, deleteCalendarEvent } from "@/lib/googleCalendar";
import { createDraftInvoiceForBooking, syncInvoiceWithBooking } from "@/lib/invoicing";
import { deleteUploadedFile } from "@/lib/uploads";
import { sendCustomerEmail } from "@/lib/email";
import { branding } from "@/lib/branding";
import { getJobNotificationSettings } from "@/lib/jobNotificationSettings";
import { getReviewRequestSettings } from "@/lib/reviewSettings";
import { renderEmailTemplate } from "@/lib/emailTemplates";
import { requirePermission, requireUser } from "@/lib/session";
import { logAction } from "@/lib/auditLog";
import { matchesPermitArea } from "@/lib/permits";
import { getAgreementSettings } from "@/lib/agreement";
import { quickAddCustomer } from "@/app/(internal)/customers/actions";
import { validatePromoCode } from "@/lib/promoCodes";
import { refundPayment, toCents } from "@/lib/stripe";
import { parseFieldDefinitions, buildAttributesFromForm } from "@/lib/categoryFields";
import { verifySpecificItemsAvailable } from "@/lib/availability";
import { findAssignmentConflict } from "@/lib/assignmentConflicts";
import { Prisma } from "@/generated/prisma";

type BookingItemInput = {
  equipmentItemId: string;
  startDate: string;
  expectedReturnDate: string;
  price: string;
};

export async function createBooking(formData: FormData) {
  const user = await requireUser();

  // The "customerId" select is disabled (so it never submits) while the
  // inline "+ New Customer" fields are open — that customer is created
  // here, server-side, in the same submission that creates the booking,
  // so there's no separate client-side "Add Customer" click required and
  // no window where the still-visible-but-stale select could silently win.
  let customerId = str(formData, "customerId");
  const newCustomerName = str(formData, "newCustomerName");
  if (!customerId && newCustomerName) {
    const newCustomerFormData = new FormData();
    newCustomerFormData.set("name", newCustomerName);
    newCustomerFormData.set("phone", str(formData, "newCustomerPhone") ?? "");
    newCustomerFormData.set("email", str(formData, "newCustomerEmail") ?? "");
    newCustomerFormData.set("address", str(formData, "newCustomerAddress") ?? "");
    newCustomerFormData.set("leadSource", str(formData, "newCustomerLeadSource") ?? "");
    const newCustomer = await quickAddCustomer(newCustomerFormData);
    customerId = newCustomer.id;
  }
  const deliveryAddress = str(formData, "deliveryAddress");
  if (!customerId) throw new Error("Customer is required");
  if (!deliveryAddress) throw new Error("Delivery address is required");
  // Re-captured as plain `string` right after the guards above — `let
  // customerId`/`const deliveryAddress` stay typed `string | null` inside
  // the nested async closure below (TypeScript doesn't carry narrowing
  // from an outer guard into a closure), same fix as submitBookingRequest
  // needed for the same reason.
  const resolvedCustomerId: string = customerId;
  const resolvedDeliveryAddress: string = deliveryAddress;

  const itemsJson = formData.get("bookingItemsJson");
  const items: BookingItemInput[] =
    typeof itemsJson === "string" ? JSON.parse(itemsJson) : [];
  const validItems = items.filter(
    (item) => item.equipmentItemId && item.startDate && item.expectedReturnDate
  );

  if (validItems.length === 0) {
    throw new Error("At least one equipment item is required");
  }

  // A promo code and a manual discount are mutually exclusive per
  // booking — a code takes priority if both were somehow filled in.
  const itemPrices = validItems.map((item) => Number(item.price) || 0);
  const subtotal = itemPrices.reduce((sum, p) => sum + p, 0);
  const promoCodeInput = str(formData, "promoCode");
  const discountType = str(formData, "discountType");
  const discountValueStr = str(formData, "discountValue");

  let appliedPromoCodeId: string | null = null;
  let discountAmount: number | null = null;
  let discountNote: string | null = null;

  if (promoCodeInput) {
    const itemCategoryIds = await db.equipmentItem
      .findMany({
        where: { id: { in: validItems.map((i) => i.equipmentItemId) } },
        select: { categoryId: true },
      })
      .then((rows) => rows.map((r) => r.categoryId));
    const check = await validatePromoCode(user.effectiveOrganizationId, promoCodeInput, subtotal, itemCategoryIds);
    if (!check.ok) throw new Error(check.error);
    appliedPromoCodeId = check.promoCode.id;
    discountAmount = check.amountOff;
    discountNote = `Promo: ${check.promoCode.code}`;
  } else if (discountType && discountValueStr) {
    const value = Math.max(0, Number(discountValueStr) || 0);
    if (value > 0) {
      const rawAmount = discountType === "percent" ? subtotal * (value / 100) : value;
      discountAmount = Math.min(rawAmount, subtotal);
      const reason = str(formData, "discountReason");
      const label = discountType === "percent" ? `${value}%` : `$${value.toFixed(2)}`;
      discountNote = reason ? `Manual: ${label} off — ${reason}` : `Manual: ${label} off`;
    }
  }

  const finalPrices =
    discountAmount && discountAmount > 0 && subtotal > 0
      ? itemPrices.map((price) => Math.max(0, price - discountAmount! * (price / subtotal)))
      : itemPrices;

  const [geocoded, permitAreas, org] = await Promise.all([
    geocodeAddress(deliveryAddress),
    db.permitArea.findMany({ where: { organizationId: user.effectiveOrganizationId } }),
    db.organization.findUniqueOrThrow({
      where: { id: user.effectiveOrganizationId },
      select: { bookingFieldDefinitions: true },
    }),
  ]);
  const bookingAttributes = buildAttributesFromForm(formData, parseFieldDefinitions(org.bookingFieldDefinitions));

  // The public booking flow re-checks availability and creates the
  // booking inside one Serializable transaction so Postgres itself
  // catches two requests racing for the same unit (see T019) — this
  // staff-facing form picks specific equipmentItemIds directly rather
  // than searching a category, so it needs its own re-check
  // (verifySpecificItemsAvailable) instead of findAvailableItems, but
  // the same transaction pattern applies. The promo-redemption cap is
  // folded in here too, for the same reason as the public flow's fix
  // (T058): a plain check-then-increment outside a transaction can let
  // two concurrent bookings both squeeze under a redemption cap.
  async function reserveAndCreateBooking() {
    return db.$transaction(
      async (tx) => {
        await verifySpecificItemsAvailable(
          user.effectiveOrganizationId,
          validItems.map((item) => ({
            equipmentItemId: item.equipmentItemId,
            startDate: new Date(item.startDate),
            endDate: new Date(item.expectedReturnDate),
          })),
          tx
        );

        if (appliedPromoCodeId) {
          const promo = await tx.promoCode.findUniqueOrThrow({ where: { id: appliedPromoCodeId } });
          if (promo.maxRedemptions !== null && promo.redemptionCount >= promo.maxRedemptions) {
            throw new Error("That promo code was just fully redeemed — remove it and try again.");
          }
          await tx.promoCode.update({
            where: { id: appliedPromoCodeId },
            data: { redemptionCount: { increment: 1 } },
          });
        }

        return tx.booking.create({
          data: {
            organizationId: user.effectiveOrganizationId,
            customerId: resolvedCustomerId,
            deliveryAddress: resolvedDeliveryAddress,
            latitude: geocoded?.latitude,
            longitude: geocoded?.longitude,
            notes: str(formData, "notes"),
            status: "confirmed",
            permitRequired: matchesPermitArea(resolvedDeliveryAddress, permitAreas),
            promoCodeId: appliedPromoCodeId,
            discountAmount,
            discountNote,
            attributes: JSON.stringify(bookingAttributes),
            items: {
              create: validItems.map((item, i) => ({
                equipmentItemId: item.equipmentItemId,
                startDate: new Date(item.startDate),
                expectedReturnDate: new Date(item.expectedReturnDate),
                price: finalPrices[i],
              })),
            },
          },
          include: { customer: true, items: { include: { equipmentItem: { include: { category: true } } } } },
        });
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }
    );
  }

  let booking;
  try {
    booking = await reserveAndCreateBooking();
  } catch (error) {
    const isConflict =
      error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2034";
    if (!isConflict) throw error;
    booking = await reserveAndCreateBooking();
  }

  await db.equipmentItem.updateMany({
    where: {
      id: { in: booking.items.map((item) => item.equipmentItemId) },
      organizationId: user.effectiveOrganizationId,
    },
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
      categoryName: item.equipmentItem.category.name,
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
  const user = await requireUser();
  const booking = await db.booking.findFirstOrThrow({
    where: { id: bookingId, organizationId: user.effectiveOrganizationId },
    include: { customer: true, items: { include: { equipmentItem: { include: { category: true } } } } },
  });

  // Re-confirming a declined/cancelled request: its units were released when
  // it was cancelled and may have been booked since — don't resurrect it on
  // top of someone else's reservation.
  if (booking.status === "cancelled") {
    await verifySpecificItemsAvailable(
      user.effectiveOrganizationId,
      booking.items
        .filter((item) => item.actualReturnDate === null)
        .map((item) => ({
          equipmentItemId: item.equipmentItemId,
          startDate: item.startDate,
          endDate: item.expectedReturnDate,
        }))
    );
  }

  for (const item of booking.items) {
    const priceStr = formData.get(`price_${item.id}`);
    const price = typeof priceStr === "string" ? Number(priceStr) || 0 : item.price;
    await db.bookingItem.update({ where: { id: item.id }, data: { price } });
  }

  await db.booking.update({ where: { id: bookingId }, data: { status: "confirmed" } });

  // Staff can change each item's price on this screen, but the invoice made
  // at checkout still carries the old amount until it's refreshed.
  await syncInvoiceWithBooking(bookingId);

  if (!booking.googleCalendarEventId) {
    const calendarEventId = await pushBookingToCalendar({
      customerName: booking.customer.name,
      deliveryAddress: booking.deliveryAddress,
      notes: booking.notes,
      items: booking.items.map((item) => ({
        label: item.equipmentItem.label,
        categoryName: item.equipmentItem.category.name,
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
  const user = await requireUser();
  const booking = await db.booking.findFirstOrThrow({
    where: { id: bookingId, organizationId: user.effectiveOrganizationId },
    include: { items: true },
  });

  await db.booking.update({ where: { id: bookingId }, data: { status: "cancelled" } });
  await releaseEquipment(user.effectiveOrganizationId, booking.items);

  revalidatePath(`/bookings/${bookingId}`);
  revalidatePath("/bookings");
  revalidatePath("/");
}

// Frees the units of a booking that was just cancelled/declined — except a
// unit that is physically out on a different, still-active job (delivered
// and not yet returned). Marking that one "available" would show a dumpster
// sitting at someone's house as free to book.
async function releaseEquipment(organizationId: string, items: { equipmentItemId: string }[]) {
  const releasable: string[] = [];
  for (const { equipmentItemId } of items) {
    const outElsewhere = await db.bookingItem.count({
      where: {
        equipmentItemId,
        deliveredAt: { not: null },
        actualReturnDate: null,
        booking: { status: { not: "cancelled" } },
      },
    });
    if (outElsewhere === 0) releasable.push(equipmentItemId);
  }
  await db.equipmentItem.updateMany({
    where: { id: { in: releasable }, organizationId },
    data: { status: "available", currentCustomerId: null, currentLocation: null },
  });
}

// Cancels a confirmed booking straight from the Calendar page — frees the
// equipment and removes the synced Google Calendar event, same outcome as
// declining a pending request, just reachable from a different screen.
export async function cancelBooking(bookingId: string) {
  const user = await requireUser();
  const booking = await db.booking.findFirstOrThrow({
    where: { id: bookingId, organizationId: user.effectiveOrganizationId },
    include: { items: true },
  });

  await db.booking.update({ where: { id: bookingId }, data: { status: "cancelled" } });
  await releaseEquipment(user.effectiveOrganizationId, booking.items);

  if (booking.googleCalendarEventId) {
    await deleteCalendarEvent(booking.googleCalendarEventId);
  }

  revalidatePath(`/bookings/${bookingId}`);
  revalidatePath("/bookings");
  revalidatePath("/calendar");
  revalidatePath("/");
}

export async function updateBooking(bookingId: string, formData: FormData) {
  const user = await requireUser();
  const deliveryAddress = str(formData, "deliveryAddress");
  if (!deliveryAddress) throw new Error("Delivery address is required");

  const booking = await db.booking.findFirstOrThrow({
    where: { id: bookingId, organizationId: user.effectiveOrganizationId },
    include: { items: true },
  });

  const addressChanged = deliveryAddress !== booking.deliveryAddress;
  const [geocoded, permitAreas, org] = await Promise.all([
    addressChanged ? geocodeAddress(deliveryAddress) : Promise.resolve(null),
    addressChanged
      ? db.permitArea.findMany({ where: { organizationId: user.effectiveOrganizationId } })
      : Promise.resolve([]),
    db.organization.findUniqueOrThrow({
      where: { id: user.effectiveOrganizationId },
      select: { bookingFieldDefinitions: true },
    }),
  ]);
  const bookingAttributes = buildAttributesFromForm(formData, parseFieldDefinitions(org.bookingFieldDefinitions));

  // Changing an item's dates used to skip the availability check entirely,
  // so a unit could be moved onto days another booking already holds it.
  // Checked before anything is written so a conflict leaves the booking
  // untouched; the booking's own items don't count against themselves.
  if (booking.status !== "cancelled") {
    const dateChanges = booking.items
      .filter((item) => item.actualReturnDate === null)
      .flatMap((item) => {
        const startStr = str(formData, `startDate_${item.id}`);
        const endStr = str(formData, `expectedReturnDate_${item.id}`);
        if (!startStr && !endStr) return [];
        return [
          {
            equipmentItemId: item.equipmentItemId,
            startDate: startStr ? new Date(startStr) : item.startDate,
            endDate: endStr ? new Date(endStr) : item.expectedReturnDate,
          },
        ];
      });
    if (dateChanges.length > 0) {
      await verifySpecificItemsAvailable(
        user.effectiveOrganizationId,
        dateChanges,
        db,
        booking.items.map((item) => item.id)
      );
    }
  }

  await db.booking.update({
    where: { id: bookingId },
    data: {
      deliveryAddress,
      notes: str(formData, "notes"),
      attributes: JSON.stringify(bookingAttributes),
      ...(geocoded
        ? { latitude: geocoded.latitude, longitude: geocoded.longitude }
        : {}),
      // Only ever auto-upgrades to true on an address change — never
      // auto-clears an existing flag, since staff may have manually
      // confirmed a permit is needed for an address that doesn't
      // textually match a configured area.
      ...(addressChanged && !booking.permitRequired && matchesPermitArea(deliveryAddress, permitAreas)
        ? { permitRequired: true }
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

  // Refresh a still-unpaid invoice so it matches the new prices/dates.
  await syncInvoiceWithBooking(bookingId);

  revalidatePath(`/bookings/${bookingId}`);
  revalidatePath("/bookings");
  redirect(`/bookings/${bookingId}`);
}

export async function deleteBooking(bookingId: string) {
  const user = await requirePermission("canDeleteRecords");

  const booking = await db.booking.findFirstOrThrow({
    where: { id: bookingId, organizationId: user.effectiveOrganizationId },
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
      organizationId: user.effectiveOrganizationId,
    },
    data: { status: "available", currentCustomerId: null, currentLocation: null },
  });

  for (const photo of booking.photos) {
    await deleteUploadedFile(photo.filePath);
  }
  await db.photo.deleteMany({ where: { bookingId } });
  await db.expense.updateMany({
    where: { bookingId, organizationId: user.effectiveOrganizationId },
    data: { bookingId: null },
  });
  await db.bookingItem.deleteMany({ where: { bookingId } });
  await db.booking.delete({ where: { id: bookingId } });
  await logAction("booking.deleted", "Booking", bookingId);

  revalidatePath("/bookings");
  revalidatePath("/");
  revalidatePath("/equipment");
  redirect("/bookings");
}

export async function notifyOnTheWay(bookingId: string) {
  const user = await requireUser();
  const booking = await db.booking.findFirstOrThrow({
    where: { id: bookingId, organizationId: user.effectiveOrganizationId },
    include: { customer: true },
  });

  if (!booking.customer.email) {
    redirect(`/bookings/${bookingId}?notified=no-email`);
  }

  try {
    const { subject, body } = await renderEmailTemplate(
      "on_my_way",
      {
        customerName: booking.customer.name,
        address: booking.deliveryAddress,
        phone: branding.smsPhone,
        businessName: branding.businessName,
      },
      user.effectiveOrganizationId
    );
    await sendCustomerEmail(booking.customer.email, subject, body, undefined, user.effectiveOrganizationId);
  } catch (error) {
    console.error("Failed to send on-the-way email:", error);
    redirect(`/bookings/${bookingId}?notified=error`);
  }

  redirect(`/bookings/${bookingId}?notified=1`);
}

export async function setBookingVehicle(bookingId: string, formData: FormData) {
  const user = await requireUser();
  const vehicleId = str(formData, "vehicleId");
  if (vehicleId) {
    const conflict = await findAssignmentConflict(
      user.effectiveOrganizationId,
      bookingId,
      "vehicleId",
      vehicleId
    );
    if (conflict) throw new Error(`This vehicle is already assigned elsewhere — ${conflict}`);
  }
  await db.booking.updateMany({
    where: { id: bookingId, organizationId: user.effectiveOrganizationId },
    data: { vehicleId: vehicleId || null },
  });
  revalidatePath(`/bookings/${bookingId}`);
}

// Refunds all or part of a booking's collected deposit, against the same
// Stripe payment the rental itself was charged on (see
// createDraftInvoiceForBooking — the deposit was never a separate charge).
// A smaller amountDollars than the full deposit means keeping the rest —
// e.g. for damage — with the reason recorded in depositNote.
export async function releaseDeposit(bookingId: string, formData: FormData) {
  const user = await requirePermission("canManageInvoices");

  const booking = await db.booking.findFirstOrThrow({
    where: { id: bookingId, organizationId: user.effectiveOrganizationId },
    include: { invoices: true },
  });
  if (!booking.depositAmount || booking.depositAmount <= 0) {
    throw new Error("This booking has no deposit to release.");
  }
  const invoice = booking.invoices.find((i) => i.stripePaymentIntentId);
  if (!invoice?.stripePaymentIntentId) {
    throw new Error("The deposit wasn't paid through Stripe — release it outside the app.");
  }

  const alreadyReleased = booking.depositReleasedAmount ?? 0;
  const remaining = booking.depositAmount - alreadyReleased;
  const amountStr = str(formData, "amountDollars");
  const amount = amountStr ? Math.min(Math.max(0, Number(amountStr) || 0), remaining) : remaining;
  if (amount <= 0) {
    throw new Error("Nothing left of this deposit to release.");
  }

  const result = await refundPayment(user.effectiveOrganizationId, invoice.stripePaymentIntentId, toCents(amount));

  const alreadyRefundedOnInvoice = invoice.refundedAmount ?? 0;
  await db.$transaction([
    db.booking.update({
      where: { id: bookingId },
      data: {
        depositReleasedAmount: alreadyReleased + result.amountCents / 100,
        depositReleasedAt: new Date(),
        depositNote: str(formData, "note"),
      },
    }),
    db.invoice.update({
      where: { id: invoice.id },
      data: {
        refundedAmount: alreadyRefundedOnInvoice + result.amountCents / 100,
        refundedAt: new Date(),
      },
    }),
  ]);

  await logAction("booking.deposit_released", "Booking", bookingId);
  revalidatePath(`/bookings/${bookingId}`);
  revalidatePath(`/invoices/${invoice.id}`);
}

export async function setBookingDriver(bookingId: string, formData: FormData) {
  const user = await requireUser();
  const driverId = str(formData, "driverId");
  if (driverId) {
    const conflict = await findAssignmentConflict(
      user.effectiveOrganizationId,
      bookingId,
      "driverId",
      driverId
    );
    if (conflict) throw new Error(`This driver is already assigned elsewhere — ${conflict}`);
  }
  await db.booking.updateMany({
    where: { id: bookingId, organizationId: user.effectiveOrganizationId },
    data: { driverId: driverId || null },
  });
  revalidatePath(`/bookings/${bookingId}`);
  revalidatePath("/driver");
}

export async function markDelivered(bookingItemId: string) {
  const user = await requireUser();
  const existing = await db.bookingItem.findFirstOrThrow({
    where: { id: bookingItemId, booking: { organizationId: user.effectiveOrganizationId } },
  });
  // Already delivered — a double-click or a retried form submit shouldn't
  // re-send the customer notification email or churn a spurious extra
  // location-event pair (close-then-reopen at the same address).
  if (existing.deliveredAt) return;
  const bookingItem = await db.bookingItem.update({
    where: { id: bookingItemId },
    data: { deliveredAt: new Date() },
    include: { booking: { include: { customer: true } }, equipmentItem: true },
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
      movedByUserId: user.id,
    },
  });

  const customer = bookingItem.booking.customer;
  if (customer.email) {
    try {
      const notifySettings = await getJobNotificationSettings(user.effectiveOrganizationId);
      if (notifySettings.enabled) {
        const host = (await headers()).get("host");
        const manageLink = host
          ? `https://${host}/booking/${bookingItem.bookingId}/manage`
          : "";
        const { subject, body } = await renderEmailTemplate(
          "delivered",
          {
            customerName: customer.name,
            equipmentLabel: bookingItem.equipmentItem.label,
            address: bookingItem.booking.deliveryAddress,
            phone: branding.smsPhone,
            businessName: branding.businessName,
            manageLink,
          },
          user.effectiveOrganizationId
        );
        await sendCustomerEmail(customer.email, subject, body, undefined, user.effectiveOrganizationId);
      }
    } catch (error) {
      // A notification hiccup shouldn't block the delivery from being recorded.
      console.error("Failed to send delivery notification email:", error);
    }
  }

  revalidatePath(`/bookings/${bookingItem.bookingId}`);
  revalidatePath("/");
  revalidatePath("/equipment");
}

export async function markReturned(bookingItemId: string, formData: FormData) {
  const user = await requireUser();
  const existing = await db.bookingItem.findFirstOrThrow({
    where: { id: bookingItemId, booking: { organizationId: user.effectiveOrganizationId } },
  });
  // Same reasoning as markDelivered — a double-click/retry shouldn't
  // re-send the pickup email, re-log mileage, or churn location history.
  if (existing.actualReturnDate) return;

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
    include: { booking: { include: { customer: true } }, equipmentItem: true },
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
    data: { equipmentItemId: bookingItem.equipmentItemId, location: "Yard", movedByUserId: user.id },
  });

  // Feed the mileage log from the same field used for overage billing, so
  // staff aren't entering the same trip mileage twice. Logged once per
  // booking (against whichever truck was assigned to the job) even if the
  // booking has multiple items — one job is one trip, not one per item.
  if (bookingItem.actualMileage) {
    const alreadyLogged = await db.mileageLogEntry.findFirst({
      where: { bookingId: bookingItem.bookingId, organizationId: user.effectiveOrganizationId },
    });
    if (!alreadyLogged) {
      await db.mileageLogEntry.create({
        data: {
          organizationId: user.effectiveOrganizationId,
          vehicleId: bookingItem.booking.vehicleId,
          equipmentItemId: bookingItem.booking.vehicleId ? null : bookingItem.equipmentItemId,
          bookingId: bookingItem.bookingId,
          date: new Date(),
          miles: bookingItem.actualMileage,
          purpose: "Job round trip",
          source: "manual",
        },
      });
    }
  }

  // If every item on this booking is now back, the job is complete —
  // auto-generate a draft invoice (skipped if one already exists).
  const remaining = await db.bookingItem.count({
    where: { bookingId: bookingItem.bookingId, actualReturnDate: null },
  });
  if (remaining === 0) {
    await createDraftInvoiceForBooking(bookingItem.bookingId);
  }

  const pickupCustomer = bookingItem.booking.customer;
  if (pickupCustomer.email) {
    try {
      const notifySettings = await getJobNotificationSettings(user.effectiveOrganizationId);
      if (notifySettings.enabled) {
        const { subject, body } = await renderEmailTemplate(
          "picked_up",
          {
            customerName: pickupCustomer.name,
            equipmentLabel: bookingItem.equipmentItem.label,
            address: bookingItem.booking.deliveryAddress,
            weightLine:
              bookingItem.actualTonnage != null
                ? `\nTotal weight: ${bookingItem.actualTonnage.toFixed(2)} tons.\n`
                : "",
            businessName: branding.businessName,
          },
          user.effectiveOrganizationId
        );
        await sendCustomerEmail(pickupCustomer.email, subject, body, undefined, user.effectiveOrganizationId);
      }
    } catch (error) {
      // A notification hiccup shouldn't block the pickup from being recorded.
      console.error("Failed to send pickup notification email:", error);
    }
  }

  revalidatePath(`/bookings/${bookingItem.bookingId}`);
  revalidatePath("/");
  revalidatePath("/equipment");
  revalidatePath("/invoices");
}

// Marks a customer-submitted extension or dump-and-return request as
// handled — this is just clearing it off the to-do list, it doesn't itself
// change the booking's dates or trigger a dump trip. Staff make the actual
// change (edit the booking, log a dump) through the normal tools.
export async function resolveServiceRequest(requestId: string) {
  const user = await requireUser();
  await db.serviceRequest.findFirstOrThrow({
    where: { id: requestId, booking: { organizationId: user.effectiveOrganizationId } },
  });
  const request = await db.serviceRequest.update({
    where: { id: requestId },
    data: { status: "resolved", resolvedAt: new Date() },
  });
  revalidatePath(`/bookings/${request.bookingId}`);
  revalidatePath("/");
}

// Lets staff mark a booking as already reviewed without sending an email —
// e.g. the customer left a review on their own, outside this flow. Reuses
// reviewRequestSentAt (the same field the automated send uses), so this
// booking is excluded from future auto-sends and from the "due" list,
// exactly as if a real send had already happened.
export async function markBookingReviewed(bookingId: string) {
  const user = await requireUser();
  const booking = await db.booking.findFirstOrThrow({
    where: { id: bookingId, organizationId: user.effectiveOrganizationId },
  });

  await db.$transaction([
    db.booking.update({
      where: { id: bookingId },
      data: { reviewRequestSentAt: new Date() },
    }),
    db.customerNote.create({
      data: {
        customerId: booking.customerId,
        type: "note",
        content: "Marked as already reviewed (no email sent)",
      },
    }),
  ]);

  await logAction("booking.marked_reviewed", "Booking", bookingId);
  revalidatePath(`/bookings/${bookingId}`);
}

// Sends the review-request email for just this one booking right now,
// bypassing the daily cron's delay/eligibility window — e.g. staff know a
// job wrapped up cleanly and don't want to wait for the automated delay.
// Only requires a Google review link to be configured, not that auto-send
// be turned on — that toggle only controls the daily cron.
export async function sendReviewRequestNow(bookingId: string) {
  const user = await requireUser();
  const booking = await db.booking.findFirstOrThrow({
    where: { id: bookingId, organizationId: user.effectiveOrganizationId },
    include: { customer: true },
  });

  if (!booking.customer.email) {
    throw new Error("This customer has no email on file.");
  }

  const settings = await getReviewRequestSettings(user.effectiveOrganizationId);
  if (!settings.googleReviewUrl) {
    throw new Error("Add a Google review link in Settings first.");
  }

  const { subject, body } = await renderEmailTemplate(
    "review_request",
    {
      customerName: booking.customer.name,
      businessName: branding.businessName,
      reviewUrl: settings.googleReviewUrl,
    },
    user.effectiveOrganizationId
  );
  await sendCustomerEmail(booking.customer.email, subject, body, undefined, user.effectiveOrganizationId);

  await db.$transaction([
    db.booking.update({
      where: { id: bookingId },
      data: { reviewRequestSentAt: new Date() },
    }),
    db.customerNote.create({
      data: {
        customerId: booking.customerId,
        type: "email",
        content: "Manually sent review request email",
      },
    }),
  ]);

  await logAction("booking.review_request_sent", "Booking", bookingId);
  revalidatePath(`/bookings/${bookingId}`);
}

// For signing on an iPad at the job site — separate from the typed-name
// checkbox "signature" used for remote/online agreement signing on /book,
// this captures an actual drawn signature (see SignaturePad) tied
// directly to the booking and its customer.
export async function signAgreementForBooking(bookingId: string, formData: FormData) {
  const user = await requireUser();
  const booking = await db.booking.findFirstOrThrow({
    where: { id: bookingId, organizationId: user.effectiveOrganizationId },
    include: { customer: true },
  });

  const signerName = str(formData, "signerName");
  const signatureUrl = str(formData, "signatureUrl");
  if (!signerName) throw new Error("Signer name is required");
  if (!signatureUrl) throw new Error("A signature is required");

  const agreement = await getAgreementSettings(user.effectiveOrganizationId);

  const headerList = await headers();
  const ipAddress =
    headerList.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    headerList.get("x-real-ip") ??
    null;

  await db.signedAgreement.create({
    data: {
      agreementTitle: agreement.title,
      agreementText: agreement.content,
      signerName,
      signerEmail: booking.customer.email,
      signerPhone: booking.customer.phone,
      signerAddress: booking.customer.address ?? booking.deliveryAddress,
      ipAddress,
      signatureUrl,
      customerId: booking.customerId,
      bookingId: booking.id,
    },
  });

  await logAction("booking.agreement_signed", "Booking", bookingId);
  revalidatePath(`/bookings/${bookingId}`);
  redirect(`/bookings/${bookingId}`);
}
