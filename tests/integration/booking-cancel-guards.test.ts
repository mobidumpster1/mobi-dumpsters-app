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
vi.mock("@/lib/email", () => ({
  sendNotificationEmail: async () => undefined,
  sendCustomerEmail: async () => undefined,
  siteOrigin: () => "http://localhost",
}));
vi.mock("@/lib/geocode", () => ({ geocodeAddress: async () => null }));

import { db } from "@/lib/db";
import { createSessionToken } from "@/lib/auth";
import { cancelBooking, declineBooking } from "@/app/(internal)/bookings/actions";
import { ACME_ORG_ID, cleanupTestFixtures, testId } from "../helpers/testOrg";

// Cancelling a job that is still sitting at the customer's must be refused:
// otherwise the unit is shown as available while it's on their driveway and
// the online page can sell it to the next customer. Acme test business only.

const ids = { customer: "", category: "", owner: "" };
const itemIds: string[] = [];

async function makeBooking(label: string, opts: { delivered: boolean; returned?: boolean; status?: string }) {
  const item = await db.equipmentItem.create({
    data: {
      organizationId: ACME_ORG_ID,
      categoryId: ids.category,
      label: testId(`cancel-${label}`),
      status: opts.delivered && !opts.returned ? "on_rent" : "reserved",
      currentLocation: "Customer site",
    },
  });
  itemIds.push(item.id);
  const booking = await db.booking.create({
    data: {
      organizationId: ACME_ORG_ID,
      customerId: ids.customer,
      deliveryAddress: "3 Cancel Test Ln",
      status: opts.status ?? "confirmed",
      notes: testId(`cancel-${label}`),
      items: {
        create: [
          {
            equipmentItemId: item.id,
            startDate: new Date(Date.now() - 86_400_000),
            expectedReturnDate: new Date(Date.now() + 86_400_000),
            price: 400,
            deliveredAt: opts.delivered ? new Date() : null,
            actualReturnDate: opts.returned ? new Date() : null,
          },
        ],
      },
    },
  });
  return { item, booking };
}

beforeAll(async () => {
  const owner = await db.user.findFirstOrThrow({ where: { organizationId: ACME_ORG_ID, role: "owner" } });
  ids.owner = owner.id;
  sessionToken = createSessionToken(owner.id);
  const customer = await db.customer.create({ data: { organizationId: ACME_ORG_ID, name: testId("cancel-customer") } });
  ids.customer = customer.id;
  const category = await db.equipmentCategory.create({
    data: { organizationId: ACME_ORG_ID, name: testId("cancel-category"), dumpsAtOwnYard: true },
  });
  ids.category = category.id;
});

afterAll(async () => {
  await db.bookingItem.deleteMany({ where: { equipmentItemId: { in: itemIds } } });
  await db.booking.deleteMany({ where: { organizationId: ACME_ORG_ID, customerId: ids.customer } });
  await db.equipmentLocationEvent.deleteMany({ where: { equipmentItemId: { in: itemIds } } });
  await db.equipmentItem.deleteMany({ where: { organizationId: ACME_ORG_ID, id: { in: itemIds } } });
  await db.equipmentCategory.deleteMany({ where: { organizationId: ACME_ORG_ID, id: ids.category } });
  await db.customer.deleteMany({ where: { organizationId: ACME_ORG_ID, id: ids.customer } });
  await cleanupTestFixtures();
});

describe("cancelling and declining bookings", () => {
  it("refuses to cancel a job that's delivered and not yet picked up, and changes nothing", async () => {
    const { booking, item } = await makeBooking("out", { delivered: true });
    await expect(cancelBooking(booking.id)).rejects.toThrow(/still out at the customer/);
    await expect(declineBooking(booking.id)).rejects.toThrow(/still out at the customer/);
    expect((await db.booking.findUniqueOrThrow({ where: { id: booking.id } })).status).toBe("confirmed");
    expect((await db.equipmentItem.findUniqueOrThrow({ where: { id: item.id } })).status).toBe("on_rent");
  });

  it("cancels a job that hasn't been delivered yet and frees the unit", async () => {
    const { booking, item } = await makeBooking("notyet", { delivered: false });
    await cancelBooking(booking.id);
    expect((await db.booking.findUniqueOrThrow({ where: { id: booking.id } })).status).toBe("cancelled");
    expect((await db.equipmentItem.findUniqueOrThrow({ where: { id: item.id } })).status).toBe("available");
  });

  it("cancels a job whose unit has already come back", async () => {
    const { booking } = await makeBooking("back", { delivered: true, returned: true });
    await cancelBooking(booking.id);
    expect((await db.booking.findUniqueOrThrow({ where: { id: booking.id } })).status).toBe("cancelled");
  });

  it("declines a pending request", async () => {
    const { booking } = await makeBooking("pending", { delivered: false, status: "pending" });
    await declineBooking(booking.id);
    expect((await db.booking.findUniqueOrThrow({ where: { id: booking.id } })).status).toBe("cancelled");
  });
});
