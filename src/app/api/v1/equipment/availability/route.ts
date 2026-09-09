import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { authenticateApiRequest } from "@/lib/apiAuth";
import { unitFreeAfter } from "@/lib/dumpSchedule";
import { getDumpScheduleSettings } from "@/lib/dumpScheduleSettings";

const UNBOOKABLE_STATUSES = ["retired", "needs_repair"];

// GET /api/v1/equipment/availability?categoryId=X&startDate=YYYY-MM-DD&endDate=YYYY-MM-DD
// Mirrors findAvailableItems (src/lib/availability.ts), which can't be
// reused directly here — it resolves its organization via
// getPublicOrganizationId() (hostname-based, for the customer booking
// page), not an API key.
export async function GET(request: Request) {
  const auth = await authenticateApiRequest(request);
  if (!auth) {
    return NextResponse.json({ error: "Invalid or missing API key." }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const categoryId = searchParams.get("categoryId");
  const startDateStr = searchParams.get("startDate");
  const endDateStr = searchParams.get("endDate");
  if (!categoryId || !startDateStr || !endDateStr) {
    return NextResponse.json(
      { error: "categoryId, startDate, and endDate are all required." },
      { status: 400 }
    );
  }
  const startDate = new Date(startDateStr);
  const endDate = new Date(endDateStr);
  if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
    return NextResponse.json({ error: "startDate/endDate must be valid dates." }, { status: 400 });
  }

  const category = await db.equipmentCategory.findFirst({
    where: { id: categoryId, organizationId: auth.organizationId },
  });
  if (!category) {
    return NextResponse.json({ error: "Unknown categoryId." }, { status: 404 });
  }

  const effectiveCategoryId = category.bundleOfCategoryId ?? category.id;
  const needed = category.bundleOfCategoryId ? category.bundleQuantity : 1;

  const dumpSchedule = await getDumpScheduleSettings(auth.organizationId);
  const bufferedEndDate = unitFreeAfter(endDate, category.dumpsAtOwnYard, dumpSchedule);

  const items = await db.equipmentItem.findMany({
    where: {
      categoryId: effectiveCategoryId,
      organizationId: auth.organizationId,
      status: { notIn: UNBOOKABLE_STATUSES },
    },
    include: {
      bookingItems: { where: { actualReturnDate: null, startDate: { lt: bufferedEndDate } } },
      maintenanceWindows: { where: { startDate: { lt: endDate }, endDate: { gt: startDate } } },
    },
  });

  const availableCount = items.filter(
    (item) =>
      item.maintenanceWindows.length === 0 &&
      item.bookingItems.every(
        (bi) => unitFreeAfter(bi.expectedReturnDate, category.dumpsAtOwnYard, dumpSchedule) <= startDate
      )
  ).length;

  return NextResponse.json({
    categoryId: category.id,
    categoryName: category.name,
    startDate: startDate.toISOString(),
    endDate: endDate.toISOString(),
    neededUnits: needed,
    availableUnits: availableCount,
    isAvailable: availableCount >= needed,
  });
}
