import Link from "next/link";
import { db } from "@/lib/db";
import { createCategory } from "../actions";
import { Field, inputClass } from "@/components/Field";
import { CategoryFieldBuilder } from "@/components/CategoryFieldBuilder";
import { CategoryPricingFields } from "@/components/CategoryPricingFields";
import { PricingTierBuilder } from "@/components/PricingTierBuilder";
import { BundleFields } from "@/components/BundleFields";

export default async function NewCategoryPage() {
  const categoryOptions = await db.equipmentCategory.findMany({
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });

  return (
    <div className="max-w-2xl">
      <h1 className="text-3xl font-bold tracking-tight text-ink">New Category</h1>
      <p className="mt-1 text-sm text-zinc-500">
        A category is a type of rentable thing, like &quot;Excavator&quot; or
        &quot;Tiller&quot;. Define what extra fields items of this type
        should track below.
      </p>
      <form action={createCategory} className="mt-6 flex flex-col gap-4">
        <Field label="Name" htmlFor="name">
          <input
            id="name"
            name="name"
            required
            placeholder="e.g. Excavator"
            className={inputClass}
          />
        </Field>
        <Field label="Description (optional)" htmlFor="description">
          <input id="description" name="description" className={inputClass} />
        </Field>
        <CategoryFieldBuilder />
        <CategoryPricingFields />
        <PricingTierBuilder />
        <BundleFields categoryOptions={categoryOptions} />
        <div className="flex gap-3">
          <button
            type="submit"
            className="rounded-xl bg-brand px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-brand-dark"
          >
            Save Category
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
