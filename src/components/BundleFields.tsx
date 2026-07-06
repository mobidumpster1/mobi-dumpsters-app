import { Field, inputClass } from "@/components/Field";

export function BundleFields({
  categoryOptions,
  initial,
}: {
  categoryOptions: { id: string; name: string }[];
  initial?: { bundleOfCategoryId: string | null; bundleQuantity: number };
}) {
  if (categoryOptions.length === 0) return null;

  return (
    <div className="flex flex-col gap-4 rounded-xl border border-zinc-200 p-4">
      <h3 className="text-sm font-medium text-zinc-700">Bundle (optional)</h3>
      <p className="text-xs text-zinc-500">
        Use this for a listing like &quot;40 Yard — Two Containers&quot; that
        books multiple units of another category instead of owning its own
        equipment. Leave blank for a normal category.
      </p>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Books units from" htmlFor="bundleOfCategoryId">
          <select
            id="bundleOfCategoryId"
            name="bundleOfCategoryId"
            defaultValue={initial?.bundleOfCategoryId ?? ""}
            className={inputClass}
          >
            <option value="">— Not a bundle —</option>
            {categoryOptions.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Units needed" htmlFor="bundleQuantity">
          <input
            id="bundleQuantity"
            name="bundleQuantity"
            type="number"
            min="1"
            defaultValue={initial?.bundleQuantity ?? 2}
            className={inputClass}
          />
        </Field>
      </div>
    </div>
  );
}
