export function CrossSellFields({
  categoryOptions,
  initial,
}: {
  categoryOptions: { id: string; name: string }[];
  initial?: string[];
}) {
  if (categoryOptions.length === 0) return null;
  const selected = new Set(initial ?? []);

  return (
    <div className="flex flex-col gap-2 rounded-xl border border-zinc-200 p-4">
      <h3 className="text-sm font-medium text-zinc-700">Cross-Sell (optional)</h3>
      <p className="text-xs text-zinc-500">
        Suggested alongside this one on the booking page&apos;s review step — e.g. a dumpster
        category suggesting a trailer category. Pick whatever&apos;s actually often rented
        together; nothing here is inferred automatically.
      </p>
      <div className="mt-1 flex flex-wrap gap-3">
        {categoryOptions.map((c) => (
          <label key={c.id} className="flex items-center gap-1.5 text-sm text-zinc-700">
            <input
              type="checkbox"
              name="crossSellCategoryIds"
              value={c.id}
              defaultChecked={selected.has(c.id)}
              className="h-4 w-4 rounded border-zinc-300"
            />
            {c.name}
          </label>
        ))}
      </div>
    </div>
  );
}
