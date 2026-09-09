import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { authenticateApiRequest } from "@/lib/apiAuth";

// GET /api/v1/bookings?limit=25&cursor=<bookingId>
// Read-only, cursor-paginated, newest first. Requires an API key
// (Authorization: Bearer <key>) generated from Settings -> API Access.
export async function GET(request: Request) {
  const auth = await authenticateApiRequest(request);
  if (!auth) {
    return NextResponse.json({ error: "Invalid or missing API key." }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const limit = Math.min(100, Math.max(1, Number(searchParams.get("limit")) || 25));
  const cursor = searchParams.get("cursor");

  const bookings = await db.booking.findMany({
    where: { organizationId: auth.organizationId },
    orderBy: { createdAt: "desc" },
    take: limit,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    include: {
      customer: { select: { name: true, email: true, phone: true } },
      items: { include: { equipmentItem: { select: { label: true, assetTag: true } } } },
    },
  });

  return NextResponse.json({
    data: bookings.map((b) => ({
      id: b.id,
      status: b.status,
      deliveryAddress: b.deliveryAddress,
      customer: b.customer,
      notes: b.notes,
      createdAt: b.createdAt,
      items: b.items.map((i) => ({
        equipmentLabel: i.equipmentItem.label,
        assetTag: i.equipmentItem.assetTag,
        startDate: i.startDate,
        expectedReturnDate: i.expectedReturnDate,
        actualReturnDate: i.actualReturnDate,
        price: i.price,
      })),
    })),
    nextCursor: bookings.length === limit ? bookings[bookings.length - 1].id : null,
  });
}
