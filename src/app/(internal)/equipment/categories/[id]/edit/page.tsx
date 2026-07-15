import { notFound } from "next/navigation";
import Link from "next/link";
import { db } from "@/lib/db";
import { updateCategory } from "../../actions";
import { Field, inputClass } from "@/components/Field";
import { CategoryFieldBuilder } from "@/components/CategoryFieldBuilder";
import { CategoryPricingFields } from "@/components/CategoryPricingFields";
import { PricingTierBuilder } from "@/components/PricingTierBuilder";
import { MaterialOptionBuilder } from "@/components/MaterialOptionBuilder";
import { BundleFields } from "@/components/BundleFields";
import { ImageUploadField } from "@/components/ImageUploadField";
import { parseFieldDefinitions } from "@/lib/categoryFields";
import { requireUser } from "@/lib/session";

export default async function EditCategoryPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await requireUser();
  const [category, categoryOptions] = await Promise.all([
    db.equipmentCategory.findFirst({
      where: { id, organizationId: user.effectiveOrganizationId },
      include: {
        pricingTiers: { orderBy: { sortOrder: "asc" } },
        materialOptions: { orderBy: { sortOrder: "asc" } },
      },
    }),
    db.equipmentCategory.findMany({
      where: { id: { not: id }, organizationId: user.effectiveOrganizationId },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
  ]);
  if (!category) notFound();

  const updateWithId = updateCategory.bind(null, category.id);
  const fields = parseFieldDefinitions(category.fieldDefinitions);

  return (
    <div className="max-w-2xl">
      <h1 className="text-3xl font-black tracking-tight text-ink">Edit Rental Type</h1>
      <p className="mt-1 text-sm text-zinc-500">
        Photo, price, and dimensions here are what customers see on the
        booking page for every &quot;{category.name}&quot; item.
      </p>
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
        <Field label="Dimensions (optional)" htmlFor="dimensions">
          <input
            id="dimensions"
            name="dimensions"
            placeholder={`e.g. 16' L x 7' W x 4.5' H`}
            defaultValue={category.dimensions ?? ""}
            className={inputClass}
          />
        </Field>
        <Field label="Booking page note (optional)" htmlFor="bookingNote">
          <textarea
            id="bookingNote"
            name="bookingNote"
            rows={2}
            placeholder="e.g. Best for light material — for concrete, dirt, brick or roofing, choose the 20 yard."
            defaultValue={category.bookingNote ?? ""}
            className={inputClass}
          />
        </Field>
        <ImageUploadField
          name="imageUrl"
          label="Photo (shown to customers on the booking page)"
          initialUrl={category.imageUrl}
          folder={`categories/${category.id}`}
        />
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
        <MaterialOptionBuilder
          initialOptions={category.materialOptions.map((m) => ({
            name: m.name,
            unit: m.unit,
            pricePerUnit: m.pricePerUnit,
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
            className="rounded-lg bg-brand px-5 py-3 text-sm font-bold text-white transition-colors hover:bg-brand-dark"
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
