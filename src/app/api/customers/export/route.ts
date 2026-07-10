import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser, hasPermission } from "@/lib/session";
import { logAction } from "@/lib/auditLog";
import { LEAD_SOURCE_LABELS } from "@/lib/leadSource";

const COLUMNS = [
  "Name",
  "Company",
  "Phone",
  "Email",
  "Address",
  "Found Us Via",
  "Tags",
  "Bookings",
  "Created",
] as const;

// Wraps a value in quotes and escapes any embedded quotes, per the CSV
// spec — needed because names/addresses/notes routinely contain commas.
function csvCell(value: string | number): string {
  return `"${String(value).replace(/"/g, '""')}"`;
}

// Gated on canViewReports rather than a dedicated permission — exporting
// the full customer list is the same class of "broad business data
// access" as viewing profit reports, and the app deliberately keeps
// permissions coarse rather than adding a new flag per feature.
export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }
  if (!hasPermission(user, "canViewReports")) {
    return NextResponse.json({ error: "You don't have permission to do that." }, { status: 403 });
  }

  const customers = await db.customer.findMany({
    orderBy: { name: "asc" },
    include: { bookings: { select: { id: true } } },
  });

  const rows = customers.map((c) =>
    [
      c.name,
      c.companyName ?? "",
      c.phone ?? "",
      c.email ?? "",
      c.address ?? "",
      c.leadSource ? (LEAD_SOURCE_LABELS[c.leadSource] ?? c.leadSource) : "",
      c.tags,
      c.bookings.length,
      c.createdAt.toISOString().slice(0, 10),
    ]
      .map(csvCell)
      .join(",")
  );

  const csv = [COLUMNS.map(csvCell).join(","), ...rows].join("\r\n");

  await logAction("customer.exported", "Customer");

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="customers-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  });
}
