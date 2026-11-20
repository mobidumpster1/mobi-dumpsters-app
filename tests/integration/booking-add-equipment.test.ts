import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { db } from "@/lib/db";
import { addFirstEquipmentToBooking } from "@/lib/bookingEquipment";
import { ACME_ORG_ID, cleanupTestFixtures, testId } from "../helpers/testOrg";

// A booking made by accepting a quote starts with no equipment and no dates,
// so it never reaches the calendar or driver view. It can now be given its
// first unit and dates. Acme test business only.

const ids = { customer: "", category: "", unit: "", busyUnit: "" };
const itemIds: string[] = [];

function futureDay(daysAhead: number) {
  return new Date(Date.now() + daysAhead * 86_400_000).toISOString().slice(0, 10);
}

async function emptyBooking(label: string, status = "confirmed") {
  return db.booking.create({
    data: {
      organizationId: ACME_ORG_ID,
      customerId: ids.customer,
      deliveryAddress: "5 Quote Accept Way",
      status,
      notes: testId(`addequip-${label}`),
    },
  });
}

beforeAll(async () => {
  const customer = await db.customer.create({ data: { organizationId: ACME_ORG_ID, name: testId("addequip-customer") } });
  ids.customer = customer.id;
  const category = await db.equipmentCategory.create({
    data: { organizationId: ACME_ORG_ID, name: testId("addequip-category"), dumpsAtOwnYard: true },
  });
  ids.category = category.id;
  for (const key of ["unit", "busyUnit"] as const) {
    const unit = await db.equipmentItem.create({
      data: { organizationId: ACME_ORG_ID, categoryId: category.id, label: testId(`addequip-${key}`) },
    });
    ids[key] = unit.id;
    itemIds.push(unit.id);
  }
});

afterAll(async () => {
  await db.bookingItem.deleteMany({ where: { equipmentItemId: { in: itemIds } } });
  await db.booking.deleteMany({ where: { organizationId: ACME_ORG_ID, customerId: ids.customer } });
  await db.equipmentItem.deleteMany({ where: { organizationId: ACME_ORG_ID, id: { in: itemIds } } });
  await db.equipmentCategory.deleteMany({ where: { organizationId: ACME_ORG_ID, id: ids.category } });
  await db.customer.deleteMany({ where: { organizationId: ACME_ORG_ID, id: ids.customer } });
  await cleanupTestFixtures();
});

describe("giving a quote-accepted booking its equipment", () => {
  it("adds the unit and dates, and reserves the unit when the booking is confirmed", async () => {
    const booking = await emptyBooking("ok");
    await addFirstEquipmentToBooking(ACME_ORG_ID, booking.id, {
      equipmentItemId: ids.unit,
      startDate: futureDay(1200),
      endDate: futureDay(1205),
      price: 1500,
    });
    const items = await db.bookingItem.findMany({ where: { bookingId: booking.id } });
    expect(items).toHaveLength(1);
    expect(items[0].price).toBe(1500);
    expect(items[0].equipmentItemId).toBe(ids.unit);
    expect((await db.equipmentItem.findUniqueOrThrow({ where: { id: ids.unit } })).status).toBe("reserved");
  });

  it("only works on a booking that has no equipment yet", async () => {
    const booking = await emptyBooking("twice");
    const input = { equipmentItemId: ids.busyUnit, startDate: futureDay(1300), endDate: futureDay(1303), price: 0 };
    await addFirstEquipmentToBooking(ACME_ORG_ID, booking.id, input);
    await expect(addFirstEquipmentToBooking(ACME_ORG_ID, booking.id, input)).rejects.toThrow(/already has equipment/);
  });

  it("refuses a unit that's already booked for those dates", async () => {
    const other = await emptyBooking("conflict");
    await expect(
      addFirstEquipmentToBooking(ACME_ORG_ID, other.id, {
        equipmentItemId: ids.busyUnit,
        startDate: futureDay(1301),
        endDate: futureDay(1302),
        price: 0,
      })
    ).rejects.toThrow();
    expect(await db.bookingItem.count({ where: { bookingId: other.id } })).toBe(0);
  });

  it("refuses bad dates, missing prices, cancelled bookings and other businesses' units", async () => {
    const booking = await emptyBooking("bad");
    const ok = { equipmentItemId: ids.unit, startDate: futureDay(1400), endDate: futureDay(1402), price: 10 };
    await expect(addFirstEquipmentToBooking(ACME_ORG_ID, booking.id, { ...ok, startDate: "" })).rejects.toThrow(/delivery date/);
    await expect(addFirstEquipmentToBooking(ACME_ORG_ID, booking.id, { ...ok, endDate: futureDay(1399) })).rejects.toThrow(/after the delivery/);
    await expect(addFirstEquipmentToBooking(ACME_ORG_ID, booking.id, { ...ok, price: -5 })).rejects.toThrow(/price/);
    await expect(addFirstEquipmentToBooking(ACME_ORG_ID, booking.id, { ...ok, equipmentItemId: "not-a-unit" })).rejects.toThrow(/in service/);
    const cancelled = await emptyBooking("cancelled", "cancelled");
    await expect(addFirstEquipmentToBooking(ACME_ORG_ID, cancelled.id, ok)).rejects.toThrow(/cancelled/);
    await expect(addFirstEquipmentToBooking("some-other-business", booking.id, ok)).rejects.toThrow(/wasn't found/);
  });
});
