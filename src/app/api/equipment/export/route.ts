import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser, hasPermission } from "@/lib/session";
import { logAction } from "@/lib/auditLog";
import { formatEquipmentStatus } from "@/lib/equipmentStatus";

const COLUMNS = [
  "Label",
  "Asset Tag",
  "Category",
  "Status",
  "Current Location",
  "Home Location",
  "Notes",
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

  const items = await db.equipmentItem.findMany({
    where: { organizationId: user.effectiveOrganizationId },
    orderBy: { label: "asc" },
    include: { category: true, homeLocation: true },
  });

  const rows = items.map((item) =>
    [
      item.label,
      item.assetTag ?? "",
      item.category.name,
      formatEquipmentStatus(item.status),
      item.currentLocation ?? "",
      item.homeLocation?.name ?? "",
      item.notes ?? "",
      item.createdAt.toISOString().slice(0, 10),
    ]
      .map(csvCell)
      .join(",")
  );

  const csv = [COLUMNS.map(csvCell).join(","), ...rows].join("\r\n");

  await logAction("equipment.exported", "EquipmentItem");

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="equipment-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  });
}
