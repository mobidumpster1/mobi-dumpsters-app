"use client";

import { useState } from "react";
import { LocationMap } from "@/components/LocationMap";

type MappableCustomer = { id: string; name: string; lat: number; lng: number };

export function SelectableCustomerMap({ customers }: { customers: MappableCustomer[] }) {
  const [selected, setSelected] = useState<Set<string>>(
    () => new Set(customers.map((c) => c.id))
  );

  const allSelected = selected.size === customers.length && customers.length > 0;

  function toggleAll() {
    setSelected(allSelected ? new Set() : new Set(customers.map((c) => c.id)));
  }

  function toggleOne(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  const pins = customers
    .filter((c) => selected.has(c.id))
    .map((c) => ({
      id: c.id,
      lat: c.lat,
      lng: c.lng,
      label: c.name,
      href: `/customers/${c.id}`,
    }));

  if (customers.length === 0) {
    return <LocationMap pins={[]} />;
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-3 rounded-lg border-2 border-zinc-900 bg-white p-3">
        <span className="text-sm text-zinc-500">
          Showing {selected.size} of {customers.length} on the map
        </span>
        <button
          type="button"
          onClick={toggleAll}
          className="flex-shrink-0 text-sm font-semibold text-brand hover:underline"
        >
          {allSelected ? "Clear all" : "Select all"}
        </button>
      </div>
      <div className="flex max-h-32 flex-wrap gap-2 overflow-y-auto rounded-lg border-2 border-zinc-900 bg-white p-3">
        {customers.map((c) => (
          <label
            key={c.id}
            className="flex items-center gap-1.5 rounded-full border border-zinc-200 px-3 py-1.5 text-sm text-zinc-700 hover:bg-zinc-50"
          >
            <input
              type="checkbox"
              checked={selected.has(c.id)}
              onChange={() => toggleOne(c.id)}
              className="h-4 w-4 rounded border-zinc-300"
            />
            {c.name}
          </label>
        ))}
      </div>
      <LocationMap pins={pins} />
    </div>
  );
}
