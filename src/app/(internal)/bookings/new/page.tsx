import { db } from "@/lib/db";
import { NewBookingForm } from "./NewBookingForm";
import { requireUser } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function NewBookingPage() {
  const user = await requireUser();
  const [customers, items] = await Promise.all([
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
  ]);

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
      />
    </div>
  );
}
