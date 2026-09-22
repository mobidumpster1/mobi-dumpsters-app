import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { db } from "@/lib/db";
import { findAssignmentConflict } from "@/lib/assignmentConflicts";
import { ACME_ORG_ID, testId } from "../helpers/testOrg";

// Regression test for T038: setBookingVehicle/setBookingDriver used to be
// a plain field update with zero conflict checking — the same truck or
// driver could be assigned to two overlapping jobs. findAssignmentConflict
// (src/lib/assignmentConflicts.ts) is the fix; this exercises it directly
// against real overlapping and non-overlapping bookings.
describe("assignment conflicts (T038 regression)", () => {
  const customerId = { current: "" };
  const vehicleId = { current: "" };
  const categoryId = { current: "" };
  const item1Id = { current: "" };
  const item2Id = { current: "" };
  const bookingAssignedId = { current: "" };
  const bookingOverlapId = { current: "" };
  const bookingNoOverlapId = { current: "" };

  beforeAll(async () => {
    const customer = await db.customer.create({
      data: { organizationId: ACME_ORG_ID, name: testId("assign-customer") },
    });
    customerId.current = customer.id;

    const vehicle = await db.vehicle.create({
      data: { organizationId: ACME_ORG_ID, label: testId("assign-truck") },
    });
    vehicleId.current = vehicle.id;

    const category = await db.equipmentCategory.create({
      data: { organizationId: ACME_ORG_ID, name: testId("assign-category"), dumpsAtOwnYard: true },
    });
    categoryId.current = category.id;

    const item1 = await db.equipmentItem.create({
      data: { organizationId: ACME_ORG_ID, categoryId: category.id, label: testId("assign-item-1") },
    });
    item1Id.current = item1.id;
    const item2 = await db.equipmentItem.create({
      data: { organizationId: ACME_ORG_ID, categoryId: category.id, label: testId("assign-item-2") },
    });
    item2Id.current = item2.id;

    const assigned = await db.booking.create({
      data: {
        organizationId: ACME_ORG_ID,
        customerId: customer.id,
        deliveryAddress: "111 Assign Test Ave",
        status: "confirmed",
        notes: testId("assign-booking-assigned"),
        vehicleId: vehicle.id,
        items: {
          create: [
            {
              equipmentItemId: item1.id,
              startDate: new Date("2027-04-01T09:00:00Z"),
              expectedReturnDate: new Date("2027-04-05T09:00:00Z"),
            },
          ],
        },
      },
    });
    bookingAssignedId.current = assigned.id;

    const overlapping = await db.booking.create({
      data: {
        organizationId: ACME_ORG_ID,
        customerId: customer.id,
        deliveryAddress: "222 Assign Test Ave",
        status: "confirmed",
        notes: testId("assign-booking-overlap"),
        items: {
          create: [
            {
              equipmentItemId: item2.id,
              startDate: new Date("2027-04-03T09:00:00Z"),
              expectedReturnDate: new Date("2027-04-06T09:00:00Z"),
            },
          ],
        },
      },
    });
    bookingOverlapId.current = overlapping.id;

    const nonOverlapping = await db.booking.create({
      data: {
        organizationId: ACME_ORG_ID,
        customerId: customer.id,
        deliveryAddress: "333 Assign Test Ave",
        status: "confirmed",
        notes: testId("assign-booking-no-overlap"),
        items: {
          create: [
            {
              equipmentItemId: item2.id,
              startDate: new Date("2027-05-01T09:00:00Z"),
              expectedReturnDate: new Date("2027-05-05T09:00:00Z"),
            },
          ],
        },
      },
    });
    bookingNoOverlapId.current = nonOverlapping.id;
  });

  afterAll(async () => {
    await db.bookingItem.deleteMany({
      where: { equipmentItemId: { in: [item1Id.current, item2Id.current] } },
    });
    await db.booking.deleteMany({
      where: { organizationId: ACME_ORG_ID, customerId: customerId.current },
    });
    await db.customer.deleteMany({ where: { organizationId: ACME_ORG_ID, id: customerId.current } });
    await db.equipmentItem.deleteMany({
      where: { organizationId: ACME_ORG_ID, id: { in: [item1Id.current, item2Id.current] } },
    });
    await db.equipmentCategory.deleteMany({
      where: { organizationId: ACME_ORG_ID, id: categoryId.current },
    });
    await db.vehicle.deleteMany({ where: { organizationId: ACME_ORG_ID, id: vehicleId.current } });
  });

  it("flags a conflict when assigning a vehicle already committed to overlapping dates", async () => {
    const conflict = await findAssignmentConflict(
      ACME_ORG_ID,
      bookingOverlapId.current,
      "vehicleId",
      vehicleId.current
    );
    expect(conflict).not.toBeNull();
    expect(conflict).toContain("overlapping dates");
  });

  it("allows assigning the same vehicle to a booking with no overlapping dates", async () => {
    const conflict = await findAssignmentConflict(
      ACME_ORG_ID,
      bookingNoOverlapId.current,
      "vehicleId",
      vehicleId.current
    );
    expect(conflict).toBeNull();
  });
});
