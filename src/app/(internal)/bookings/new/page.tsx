import { db } from "@/lib/db";
import { NewBookingForm } from "./NewBookingForm";
import { parseFieldDefinitions } from "@/lib/categoryFields";
import { requireUser } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function NewBookingPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>;
}) {
  const user = await requireUser();
  const { date } = await searchParams;
  const [customers, items, org] = await Promise.all([
    db.customer.findMany({
      where: { organizationId: user.effectiveOrganizationId },
      orderBy: { name: "asc" },
      select: { id: true, name: true, address: true },
    }),
    db.equipmentItem.findMany({
      where: { status: { not: "retired" }, organizationId: user.effectiveOrganizationId },
      orderBy: { label: "asc" },
      include: { category: true },
    }),
    db.organization.findUniqueOrThrow({
      where: { id: user.effectiveOrganizationId },
      select: { bookingFieldDefinitions: true },
    }),
  ]);
  const fieldDefs = parseFieldDefinitions(org.bookingFieldDefinitions);

  return (
    <div className="max-w-2xl">
      <h1 className="text-3xl font-black tracking-tight text-ink">New Booking</h1>
      <NewBookingForm
        customers={customers}
        items={items.map((i) => ({
          id: i.id,
          label: i.label,
          categoryName: i.category.name,
          status: i.status,
        }))}
        fieldDefs={fieldDefs}
        initialDate={date}
      />
    </div>
  );
}
