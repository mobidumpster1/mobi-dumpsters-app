import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { updateEquipmentItem } from "../../actions";
import { EquipmentItemForm } from "@/components/EquipmentItemForm";
import { parseAttributes, parseFieldDefinitions } from "@/lib/categoryFields";
import { requireUser } from "@/lib/session";

export default async function EditEquipmentPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await requireUser();
  const [item, categories, customers] = await Promise.all([
    db.equipmentItem.findFirst({
      where: { id, organizationId: user.effectiveOrganizationId },
    }),
    db.equipmentCategory.findMany({
      where: { organizationId: user.effectiveOrganizationId },
      orderBy: { name: "asc" },
    }),
    db.customer.findMany({
      where: { organizationId: user.effectiveOrganizationId },
      orderBy: { name: "asc" },
    }),
  ]);

  if (!item) notFound();

  const updateWithId = updateEquipmentItem.bind(null, item.id);

  return (
    <div className="max-w-xl">
      <h1 className="text-3xl font-black tracking-tight text-ink">Edit Equipment</h1>
      <div className="mt-6">
        <EquipmentItemForm
          action={updateWithId}
          cancelHref={`/equipment/${item.id}`}
          categories={categories.map((c) => ({
            id: c.id,
            name: c.name,
            fieldDefinitions: parseFieldDefinitions(c.fieldDefinitions),
          }))}
          customers={customers}
          initial={{
            categoryId: item.categoryId,
            label: item.label,
            assetTag: item.assetTag ?? "",
            status: item.status,
            currentLocation: item.currentLocation ?? "",
            currentCustomerId: item.currentCustomerId ?? "",
            notes: item.notes ?? "",
            attributes: parseAttributes(item.attributes),
          }}
        />
      </div>
    </div>
  );
}
