import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser, hasPermission } from "@/lib/session";
import { logAction } from "@/lib/auditLog";

const COLUMNS = [
  "Customer",
  "Delivery Address",
  "Status",
  "Items",
  "Total",
  "Created",
] as const;

function csvCell(value: string | number): string {
  return `"${String(value).replace(/"/g, '""')}"`;
}

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }
  if (!hasPermission(user, "canViewReports")) {
    return NextResponse.json({ error: "You don't have permission to do that." }, { status: 403 });
  }

  const bookings = await db.booking.findMany({
    where: { organizationId: user.effectiveOrganizationId },
    orderBy: { createdAt: "desc" },
    include: { customer: true, items: { include: { equipmentItem: true } } },
  });

  const rows = bookings.map((b) =>
    [
      b.customer.name,
      b.deliveryAddress,
      b.status,
      b.items.map((i) => i.equipmentItem.label).join("; "),
      b.items.reduce((sum, i) => sum + i.price, 0).toFixed(2),
      b.createdAt.toISOString().slice(0, 10),
    ]
      .map(csvCell)
      .join(",")
  );

  const csv = [COLUMNS.map(csvCell).join(","), ...rows].join("\r\n");

  await logAction("booking.exported", "Booking");

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="bookings-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  });
}
