import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

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

import { db } from "@/lib/db";
import { createSessionToken } from "@/lib/auth";
import { addDamageReport, deleteDamageReport } from "@/app/(internal)/bookings/damageActions";
import { primaryInvoiceWhere } from "@/lib/invoicing";
import { ACME_ORG_ID, cleanupTestFixtures, testId } from "../helpers/testOrg";

// A damage charge found after the rental invoice was paid must not change that
// paid total (it would look paid with nothing collected for the damage). It
// goes on its own "balance due" invoice instead. Acme test business only.

const NUM = "vitest-damage";
const ids = { customer: "", category: "", owner: "", staff: "" };
const itemIds: string[] = [];
let ownerToken = "";
let staffToken = "";

async function makeBooking(label: string, status: "unpaid" | "paid") {
  const item = await db.equipmentItem.create({
    data: { organizationId: ACME_ORG_ID, categoryId: ids.category, label: testId(`dmg-${label}`) },
  });
  itemIds.push(item.id);
  const booking = await db.booking.create({
    data: {
      organizationId: ACME_ORG_ID,
      customerId: ids.customer,
      deliveryAddress: "9 Damage Test Rd",
      status: "confirmed",
      notes: testId(`dmg-${label}`),
      items: { create: [{ equipmentItemId: item.id, startDate: new Date(), expectedReturnDate: new Date(), price: 450 }] },
    },
  });
  const invoice = await db.invoice.create({
    data: {
      organizationId: ACME_ORG_ID,
      bookingId: booking.id,
      customerId: ids.customer,
      invoiceNumber: `${NUM}-${label}-${Date.now()}`,
      amount: 450,
      status,
      lineItems: { create: [{ description: "Rental", amount: 450, type: "base" }] },
    },
  });
  return { item, booking, invoice };
}

function damageForm(itemId: string, cost: string, billed = true) {
  const f = new FormData();
  f.set("equipmentItemId", itemId);
  f.set("description", "Bent door");
  f.set("estimatedCost", cost);
  if (billed) f.set("billedToCustomer", "on");
  return f;
}

beforeAll(async () => {
  const owner = await db.user.findFirstOrThrow({ where: { organizationId: ACME_ORG_ID, role: "owner" } });
  ids.owner = owner.id;
  ownerToken = createSessionToken(owner.id);
  const staff = await db.user.create({
    data: {
      name: "Damage Staff",
      email: `${testId("damage-staff")}@example.test`,
      passwordHash: "not-a-real-hash",
      role: "staff",
      organizationId: ACME_ORG_ID,
      canManageInvoices: false,
    },
  });
  ids.staff = staff.id;
  staffToken = createSessionToken(staff.id);
  sessionToken = ownerToken;

  const customer = await db.customer.create({ data: { organizationId: ACME_ORG_ID, name: testId("damage-customer") } });
  ids.customer = customer.id;
  const category = await db.equipmentCategory.create({
    data: { organizationId: ACME_ORG_ID, name: testId("damage-category"), dumpsAtOwnYard: true },
  });
  ids.category = category.id;
});

afterAll(async () => {
  await db.damageReport.deleteMany({ where: { booking: { organizationId: ACME_ORG_ID, customerId: ids.customer } } });
  await db.invoiceLineItem.deleteMany({ where: { invoice: { organizationId: ACME_ORG_ID, invoiceNumber: { startsWith: NUM } } } });
  await db.invoiceLineItem.deleteMany({ where: { invoice: { organizationId: ACME_ORG_ID, customerId: ids.customer } } });
  await db.invoice.deleteMany({ where: { organizationId: ACME_ORG_ID, customerId: ids.customer } });
  await db.bookingItem.deleteMany({ where: { equipmentItemId: { in: itemIds } } });
  await db.booking.deleteMany({ where: { organizationId: ACME_ORG_ID, customerId: ids.customer } });
  await db.equipmentItem.deleteMany({ where: { organizationId: ACME_ORG_ID, id: { in: itemIds } } });
  await db.equipmentCategory.deleteMany({ where: { organizationId: ACME_ORG_ID, id: ids.category } });
  await db.customer.deleteMany({ where: { organizationId: ACME_ORG_ID, id: ids.customer } });
  await db.auditLog.deleteMany({ where: { userId: { in: [ids.owner, ids.staff] }, action: { startsWith: "damage" } } });
  await db.user.delete({ where: { id: ids.staff } });
  await cleanupTestFixtures();
});

describe("damage charges", () => {
  it("on an unpaid invoice are added to it", async () => {
    sessionToken = ownerToken;
    const { item, booking, invoice } = await makeBooking("unpaid", "unpaid");
    await addDamageReport(booking.id, damageForm(item.id, "300"));
    const after = await db.invoice.findUniqueOrThrow({ where: { id: invoice.id }, include: { lineItems: true } });
    expect(after.amount).toBe(750);
    expect(after.lineItems.some((l) => l.type === "damage" && l.amount === 300)).toBe(true);
  });

  it("on a PAID invoice leave it untouched and become a separate balance-due invoice", async () => {
    sessionToken = ownerToken;
    const { item, booking, invoice } = await makeBooking("paid", "paid");
    await addDamageReport(booking.id, damageForm(item.id, "300"));

    const paid = await db.invoice.findUniqueOrThrow({ where: { id: invoice.id } });
    expect(paid.amount).toBe(450);
    expect(paid.status).toBe("paid");

    const all = await db.invoice.findMany({ where: { organizationId: ACME_ORG_ID, bookingId: booking.id }, include: { lineItems: true } });
    const supplemental = all.find((i) => i.source === "supplemental")!;
    expect(all).toHaveLength(2);
    expect(supplemental.amount).toBe(300);
    expect(supplemental.status).toBe("unpaid");
    expect(supplemental.lineItems[0].type).toBe("damage");

    // The booking's main invoice is still the rental one, not the supplement.
    const primary = await db.invoice.findFirstOrThrow({ where: primaryInvoiceWhere(ACME_ORG_ID, booking.id), orderBy: { createdAt: "asc" } });
    expect(primary.id).toBe(invoice.id);
  });

  it("can be deleted while unpaid (removing an empty supplemental invoice), but not once paid", async () => {
    sessionToken = ownerToken;
    const { item, booking } = await makeBooking("delete", "paid");
    await addDamageReport(booking.id, damageForm(item.id, "120"));
    const report = await db.damageReport.findFirstOrThrow({ where: { bookingId: booking.id } });
    const supplemental = await db.invoice.findFirstOrThrow({ where: { organizationId: ACME_ORG_ID, bookingId: booking.id, source: "supplemental" } });

    // Once the damage invoice is paid, erasing the charge would erase real money.
    await db.invoice.update({ where: { id: supplemental.id }, data: { status: "paid" } });
    await expect(deleteDamageReport(report.id)).rejects.toThrow(/can't be deleted/);
    expect(await db.invoice.count({ where: { organizationId: ACME_ORG_ID, id: supplemental.id } })).toBe(1);

    await db.invoice.update({ where: { id: supplemental.id }, data: { status: "unpaid" } });
    await deleteDamageReport(report.id);
    expect(await db.invoice.count({ where: { organizationId: ACME_ORG_ID, id: supplemental.id } })).toBe(0);
    expect(await db.damageReport.count({ where: { id: report.id } })).toBe(0);
  });

  it("refuse a staff member without invoice permission, but still allow logging the damage as a repair cost", async () => {
    sessionToken = staffToken;
    const { item, booking, invoice } = await makeBooking("perm", "unpaid");
    await expect(addDamageReport(booking.id, damageForm(item.id, "99"))).rejects.toThrow(/permission/i);
    expect((await db.invoice.findUniqueOrThrow({ where: { id: invoice.id } })).amount).toBe(450);

    await addDamageReport(booking.id, damageForm(item.id, "99", false));
    expect(await db.expense.count({ where: { organizationId: ACME_ORG_ID, bookingId: booking.id } })).toBe(1);
    await db.expense.deleteMany({ where: { organizationId: ACME_ORG_ID, bookingId: booking.id } });
  });
});
