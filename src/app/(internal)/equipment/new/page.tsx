import { db } from "@/lib/db";
import { createEquipmentItem } from "../actions";
import { EquipmentItemForm } from "@/components/EquipmentItemForm";
import { parseFieldDefinitions } from "@/lib/categoryFields";
import { requireUser } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function NewEquipmentPage() {
  const user = await requireUser();
  const [categories, customers] = await Promise.all([
    db.equipmentCategory.findMany({
      where: { organizationId: user.effectiveOrganizationId },
      orderBy: { name: "asc" },
    }),
    db.customer.findMany({
      where: { organizationId: user.effectiveOrganizationId },
      orderBy: { name: "asc" },
    }),
  ]);

  return (
    <div className="max-w-xl">
      <h1 className="text-3xl font-black tracking-tight text-ink">New Equipment</h1>
      <div className="mt-6">
        <EquipmentItemForm
          action={createEquipmentItem}
          categories={categories.map((c) => ({
            id: c.id,
            name: c.name,
            fieldDefinitions: parseFieldDefinitions(c.fieldDefinitions),
          }))}
          customers={customers}
        />
      </div>
    </div>
  );
}
