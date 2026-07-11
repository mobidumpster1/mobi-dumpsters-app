import { inputClass } from "@/components/Field";

type ServiceArea = { id: string; name: string };

// Displayed above the Leads search box — lets the business set which cities
// a search runs against, instead of retyping the area every time. A search
// with no saved areas here just runs the typed query as-is.
export function ServiceAreaManager({
  areas,
  addAction,
  removeAction,
}: {
  areas: ServiceArea[];
  addAction: (formData: FormData) => Promise<void>;
  removeAction: (areaId: string) => Promise<void>;
}) {
  return (
    <div className="rounded-lg border-2 border-zinc-900 bg-white p-5">
      <h2 className="text-sm font-semibold text-zinc-700">Service Areas</h2>
      <p className="mt-1 text-xs text-zinc-500">
        {areas.length > 0
          ? "Each search below automatically runs once per area listed here — e.g. \"roofers\" searches roofers in every area, using one free search per area."
          : "Add the cities you serve so searches don't need the area typed in every time — e.g. \"Byron, GA\"."}
      </p>

      {areas.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {areas.map((area) => (
            <span
              key={area.id}
              className="flex items-center gap-1.5 rounded-full border border-zinc-200 bg-zinc-50 py-1.5 pl-3 pr-1.5 text-sm text-zinc-700"
            >
              {area.name}
              <form action={removeAction.bind(null, area.id)}>
                <button
                  type="submit"
                  aria-label={`Remove ${area.name}`}
                  className="flex h-5 w-5 items-center justify-center rounded-full text-zinc-400 hover:bg-zinc-200 hover:text-zinc-700"
                >
                  ×
                </button>
              </form>
            </span>
          ))}
        </div>
      )}

      <form action={addAction} className="mt-3 flex gap-2">
        <input
          name="name"
          required
          placeholder="e.g. Macon, GA"
          className={`${inputClass} flex-1 py-2.5 text-sm`}
        />
        <button
          type="submit"
          className="flex-shrink-0 rounded-xl border border-zinc-300 px-4 py-2.5 text-sm font-semibold text-zinc-700 transition-colors hover:bg-zinc-50"
        >
          + Add Area
        </button>
      </form>
    </div>
  );
}
