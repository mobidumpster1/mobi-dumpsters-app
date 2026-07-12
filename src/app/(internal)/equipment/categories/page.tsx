import Link from "next/link";
import { db } from "@/lib/db";
import { EquipmentTabs } from "@/components/EquipmentTabs";
import { parseFieldDefinitions } from "@/lib/categoryFields";
import { requireUser } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function CategoriesPage() {
  const user = await requireUser();
  const categories = await db.equipmentCategory.findMany({
    where: { organizationId: user.effectiveOrganizationId },
    orderBy: { name: "asc" },
    include: { items: true, bundleOfCategory: true },
  });

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-ink">
            Rental Types
          </h1>
          <p className="mt-1 text-sm text-zinc-500">
            A rental type is a kind of equipment or service you offer (e.g.
            &quot;20 Yard Dumpster&quot;, &quot;Excavator&quot;). This is
            where you set each one&apos;s photo, price, and dimensions —
            what customers see on the booking page — and click into one
            below to edit it.
          </p>
        </div>
        <Link
          href="/equipment/categories/new"
          className="rounded-lg bg-brand px-5 py-3 text-sm font-bold text-white transition-colors hover:bg-brand-dark"
        >
          + New Rental Type
        </Link>
      </div>

      <div className="mt-4">
        <EquipmentTabs />
      </div>

      <div className="mt-6 flex flex-col gap-3">
        {categories.map((category) => {
          const fields = parseFieldDefinitions(category.fieldDefinitions);
          return (
            <Link
              key={category.id}
              href={`/equipment/categories/${category.id}/edit`}
              className="rounded-lg border-2 border-zinc-900 bg-white p-5 hover:border-zinc-300"
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 className="font-medium text-zinc-900">{category.name}</h2>
                <span className="text-sm text-zinc-500">
                  {category.bundleOfCategory
                    ? `Bundle: ${category.bundleQuantity}× ${category.bundleOfCategory.name}`
                    : `${category.items.length} item${category.items.length === 1 ? "" : "s"}`}
                </span>
              </div>
              {category.description && (
                <p className="mt-1 text-sm text-zinc-500">
                  {category.description}
                </p>
              )}
              <div className="mt-2 flex flex-wrap gap-2">
                {fields.map((field) => (
                  <span
                    key={field.key}
                    className="rounded-full border-2 border-zinc-300 bg-white px-2 py-0.5 text-xs font-bold text-zinc-700"
                  >
                    {field.label}
                  </span>
                ))}
              </div>
            </Link>
          );
        })}
        {categories.length === 0 && (
          <p className="text-zinc-400">No categories yet.</p>
        )}
      </div>
    </div>
  );
}
