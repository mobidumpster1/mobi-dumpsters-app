import Link from "next/link";
import { db } from "@/lib/db";
import { parseFieldDefinitions } from "@/lib/categoryFields";

export const dynamic = "force-dynamic";

export default async function CategoriesPage() {
  const categories = await db.equipmentCategory.findMany({
    orderBy: { name: "asc" },
    include: { items: true },
  });

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-ink">
            Equipment Categories
          </h1>
          <p className="mt-1 text-sm text-zinc-500">
            Each category defines the extra fields items of that type track
            (e.g. size for dumpsters, hour meter for excavators).
          </p>
        </div>
        <Link
          href="/equipment/categories/new"
          className="rounded-xl bg-brand px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-brand-dark"
        >
          + New Category
        </Link>
      </div>

      <div className="mt-6 flex flex-col gap-3">
        {categories.map((category) => {
          const fields = parseFieldDefinitions(category.fieldDefinitions);
          return (
            <Link
              key={category.id}
              href={`/equipment/categories/${category.id}/edit`}
              className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm hover:border-zinc-300"
            >
              <div className="flex items-center justify-between">
                <h2 className="font-medium text-zinc-900">{category.name}</h2>
                <span className="text-sm text-zinc-500">
                  {category.items.length} item
                  {category.items.length === 1 ? "" : "s"}
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
                    className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs text-zinc-600"
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
