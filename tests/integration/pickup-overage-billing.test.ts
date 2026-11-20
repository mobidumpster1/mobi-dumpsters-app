import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

// Who is "logged in" for the pickup form: the Acme test business's owner.
let sessionToken = "";
vi.mock("next/headers", () => ({
  cookies: async () => ({ get: (name: string) => (name === "mobi_session" ? { value: sessionToken } : undefined) }),
  headers: async () => new Headers({ host: "localhost" }),
}));
vi.mock("next/cache", () => ({ revalidatePath: () => undefined, revalidateTag: () => undefined }));
vi.mock("next/navigation", () => ({
  redirect: (url: string) => {
    throw new Error(`REDIRECT ${url}`);
  },
  notFound: () => {
    throw new Error("NOT_FOUND");
  },
}));
// No real emails, geocoding or calendar pushes.
vi.mock("@/lib/email", () => ({
  sendNotificationEmail: async () => undefined,
  sendCustomerEmail: async () => undefined,
  siteOrigin: () => "http://localhost",
}));
vi.mock("@/lib/geocode", () => ({ geocodeAddress: async () => null }));

import { db } from "@/lib/db";
import { createSessionToken } from "@/lib/auth";
import { markReturned } from "@/app/(internal)/bookings/actions";
import { billTonnageOverage } from "@/lib/overageBilling";
import { ACME_ORG_ID, cleanupTestFixtures, testId } from "../helpers/testOrg";

// Weight and miles typed on the pickup form must be charged on the invoice.
// Public checkout creates the invoice at booking time and never recomputes it,
// so before this the overage was recorded but never billed. A paid invoice is
// left alone and staff are told to bill it by hand. Acme test business only.

const NUM = "vitest-pickupbill";
const ids = { customer: "", category: "", owner: "" };
const itemIds: string[] = [];

async function makeBooking(label: string, invoiceStatus: "unpaid" | "paid") {
  const item = await db.equipmentItem.create({
    data: { organizationId: ACME_ORG_ID, categoryId: ids.category, label: `${testId(`pickup-${label}`)}` },
  });
  itemIds.push(item.id);
  const booking = await db.booking.create({
    data: {
      organizationId: ACME_ORG_ID,
      customerId: ids.customer,
      deliveryAddress: "7 Pickup Test Rd",
      status: "confirmed",
      notes: testId(`pickup-${label}`),
      items: {
        create: [
          {
            equipmentItemId: item.id,
            startDate: new Date(Date.now() - 3 * 86_400_000),
            expectedReturnDate: new Date(),
            deliveredAt: new Date(Date.now() - 3 * 86_400_000),
            price: 400,
          },
        ],
      },
    },
    include: { items: true },
  });
  const invoice = await db.invoice.create({
    data: {
      organizationId: ACME_ORG_ID,
      bookingId: booking.id,
      customerId: ids.customer,
      invoiceNumber: `${NUM}-${label}-${Date.now()}`,
      amount: 400,
      status: invoiceStatus,
      lineItems: { create: [{ description: "Rental", amount: 400, type: "base" }] },
    },
  });
  return { item, booking, invoice, bookingItemId: booking.items[0].id };
}

function form(tons: string, miles: string) {
  const f = new FormData();
  f.set("actualTonnage", tons);
  f.set("actualMileage", miles);
  return f;
}

beforeAll(async () => {
  const owner = await db.user.findFirstOrThrow({ where: { organizationId: ACME_ORG_ID, role: "owner" } });
  ids.owner = owner.id;
  sessionToken = createSessionToken(owner.id);
  const customer = await db.customer.create({ data: { organizationId: ACME_ORG_ID, name: testId("pickup-customer") } });
  ids.customer = customer.id;
  const category = await db.equipmentCategory.create({
    data: {
      organizationId: ACME_ORG_ID,
      name: testId("pickup-category"),
      dumpsAtOwnYard: true,
      includedTonnage: 2,
      overageTonnageRate: 50,
      includedMileage: 10,
      overageMileageRate: 3,
    },
  });
  ids.category = category.id;
});

afterAll(async () => {
  await db.invoiceLineItem.deleteMany({ where: { invoice: { invoiceNumber: { startsWith: NUM } } } });
  await db.invoice.deleteMany({ where: { organizationId: ACME_ORG_ID, invoiceNumber: { startsWith: NUM } } });
  await db.customerNote.deleteMany({ where: { customerId: ids.customer } });
  await db.mileageLogEntry.deleteMany({ where: { organizationId: ACME_ORG_ID, booking: { customerId: ids.customer } } });
  await db.equipmentLocationEvent.deleteMany({ where: { equipmentItemId: { in: itemIds } } });
  await db.bookingItem.deleteMany({ where: { equipmentItemId: { in: itemIds } } });
  await db.booking.deleteMany({ where: { organizationId: ACME_ORG_ID, customerId: ids.customer } });
  await db.equipmentItem.deleteMany({ where: { organizationId: ACME_ORG_ID, id: { in: itemIds } } });
  await db.equipmentCategory.deleteMany({ where: { organizationId: ACME_ORG_ID, id: ids.category } });
  await db.customer.deleteMany({ where: { organizationId: ACME_ORG_ID, id: ids.customer } });
  await db.auditLog.deleteMany({ where: { userId: ids.owner, entity: { in: ["BookingItem", "Booking"] } } });
  await cleanupTestFixtures();
});

describe("overage typed on the pickup form", () => {
  it("is charged on an unpaid invoice: 1.5 extra tons at $50 and 4 extra miles at $3", async () => {
    const { bookingItemId, invoice } = await makeBooking("unpaid", "unpaid");
    await markReturned(bookingItemId, form("3.5", "14"));

    const after = await db.invoice.findUniqueOrThrow({ where: { id: invoice.id }, include: { lineItems: true } });
    const tonnage = after.lineItems.find((l) => l.type === "overage_tonnage");
    const mileage = after.lineItems.find((l) => l.type === "overage_mileage");
    expect(tonnage?.amount).toBeCloseTo(75, 2);
    expect(mileage?.amount).toBeCloseTo(12, 2);
    expect(after.amount).toBeCloseTo(487, 2);
  });

  it("doesn't charge anything when the load is within what's included", async () => {
    const { bookingItemId, invoice } = await makeBooking("within", "unpaid");
    await markReturned(bookingItemId, form("1.9", "9"));
    const after = await db.invoice.findUniqueOrThrow({ where: { id: invoice.id }, include: { lineItems: true } });
    expect(after.amount).toBe(400);
    expect(after.lineItems.some((l) => l.type.startsWith("overage"))).toBe(false);
  });

  it("leaves a paid invoice alone and tells staff to bill it by hand", async () => {
    const { bookingItemId, invoice } = await makeBooking("paid", "paid");
    await markReturned(bookingItemId, form("4", ""));
    const after = await db.invoice.findUniqueOrThrow({ where: { id: invoice.id }, include: { lineItems: true } });
    expect(after.amount).toBe(400);
    expect(after.lineItems.some((l) => l.type.startsWith("overage"))).toBe(false);
    const note = await db.customerNote.findFirst({ where: { customerId: ids.customer, content: { contains: invoice.invoiceNumber } } });
    expect(note?.content).toMatch(/Bill it manually/);
  });

  it("never bills the same unit's overage twice", async () => {
    const { item, booking, invoice, bookingItemId } = await makeBooking("twice", "unpaid");
    await markReturned(bookingItemId, form("3", ""));
    const customer = await db.customer.findUniqueOrThrow({ where: { id: ids.customer } });
    const billable = await db.bookingItem.findUniqueOrThrow({
      where: { id: bookingItemId },
      include: { equipmentItem: { include: { category: true } } },
    });
    await billTonnageOverage(ACME_ORG_ID, customer, booking.id, billable, 3);
    const after = await db.invoice.findUniqueOrThrow({ where: { id: invoice.id }, include: { lineItems: true } });
    expect(after.lineItems.filter((l) => l.type === "overage_tonnage")).toHaveLength(1);
    expect(after.amount).toBeCloseTo(450, 2);
    expect(item.id).toBeTruthy();
  });
});
