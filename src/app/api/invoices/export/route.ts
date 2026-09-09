import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser, hasPermission } from "@/lib/session";
import { logAction } from "@/lib/auditLog";

const COLUMNS = [
  "Invoice #",
  "Customer",
  "Issue Date",
  "Due Date",
  "Amount",
  "Status",
  "Paid Date",
  "Payment Method",
] as const;

// Wraps a value in quotes and escapes any embedded quotes, per the CSV
// spec — same convention as /api/customers/export.
function csvCell(value: string | number): string {
  return `"${String(value).replace(/"/g, '""')}"`;
}

// Same permission gate as /api/customers/export — exporting financial
// records is the same class of access as viewing reports.
export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }
  if (!hasPermission(user, "canViewReports")) {
    return NextResponse.json({ error: "You don't have permission to do that." }, { status: 403 });
  }

  const invoices = await db.invoice.findMany({
    where: { organizationId: user.effectiveOrganizationId },
    orderBy: { issueDate: "desc" },
    include: { customer: true, booking: { include: { customer: true } } },
  });

  const rows = invoices.map((inv) =>
    [
      inv.invoiceNumber,
      inv.booking?.customer?.name ?? inv.customer?.name ?? "",
      inv.issueDate.toISOString().slice(0, 10),
      inv.dueDate ? inv.dueDate.toISOString().slice(0, 10) : "",
      inv.amount.toFixed(2),
      inv.status,
      inv.paidDate ? inv.paidDate.toISOString().slice(0, 10) : "",
      inv.paymentMethod ?? "",
    ]
      .map(csvCell)
      .join(",")
  );

  const csv = [COLUMNS.map(csvCell).join(","), ...rows].join("\r\n");

  await logAction("invoice.exported", "Invoice");

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="invoices-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  });
}
