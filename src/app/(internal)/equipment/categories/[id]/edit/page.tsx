import { notFound } from "next/navigation";
import Link from "next/link";
import { db } from "@/lib/db";
import { updateCategory } from "../../actions";
import { Field, inputClass } from "@/components/Field";
import { CategoryFieldBuilder } from "@/components/CategoryFieldBuilder";
import { CategoryPricingFields } from "@/components/CategoryPricingFields";
import { PricingTierBuilder } from "@/components/PricingTierBuilder";
import { BundleFields } from "@/components/BundleFields";
import { parseFieldDefinitions } from "@/lib/categoryFields";

export default async function EditCategoryPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [category, categoryOptions] = await Promise.all([
    db.equipmentCategory.findUnique({
      where: { id },
      include: { pricingTiers: { orderBy: { sortOrder: "asc" } } },
    }),
    db.equipmentCategory.findMany({
      where: { id: { not: id } },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
  ]);
  if (!category) notFound();

  const updateWithId = updateCategory.bind(null, category.id);
  const fields = parseFieldDefinitions(category.fieldDefinitions);

  return (
    <div className="max-w-2xl">
      <h1 className="text-3xl font-bold tracking-tight text-ink">Edit Category</h1>
      <form action={updateWithId} className="mt-6 flex flex-col gap-4">
        <Field label="Name" htmlFor="name">
          <input
            id="name"
            name="name"
            required
            defaultValue={category.name}
            className={inputClass}
          />
        </Field>
        <Field label="Description (optional)" htmlFor="description">
          <input
            id="description"
            name="description"
            defaultValue={category.description ?? ""}
            className={inputClass}
          />
        </Field>
        <CategoryFieldBuilder initialFields={fields} />
        <CategoryPricingFields
          initial={{
            agingThresholdDays: category.agingThresholdDays,
            basePrice: category.basePrice,
            includedDays: category.includedDays,
            overageDayRate: category.overageDayRate,
            includedTonnage: category.includedTonnage,
            overageTonnageRate: category.overageTonnageRate,
            includedMileage: category.includedMileage,
            overageMileageRate: category.overageMileageRate,
          }}
        />
        <PricingTierBuilder
          initialTiers={category.pricingTiers.map((t) => ({
            label: t.label,
            days: t.days,
            price: t.price,
          }))}
        />
        <BundleFields
          categoryOptions={categoryOptions}
          initial={{
            bundleOfCategoryId: category.bundleOfCategoryId,
            bundleQuantity: category.bundleQuantity,
          }}
        />
        <div className="flex gap-3">
          <button
            type="submit"
            className="rounded-xl bg-brand px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-brand-dark"
          >
            Save Changes
          </button>
          <Link
            href="/equipment/categories"
            className="rounded-xl border border-zinc-300 px-5 py-3 text-sm font-semibold text-zinc-700 transition-colors hover:bg-zinc-50"
          >
            Cancel
          </Link>
        </div>
      </form>
    </div>
  );
}
