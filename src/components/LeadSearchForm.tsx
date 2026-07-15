"use client";

import { useRef } from "react";
import { useFormStatus } from "react-dom";
import { inputClass } from "@/components/Field";

function SearchButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-lg bg-brand px-5 py-3 text-sm font-bold text-white transition-colors hover:bg-brand-dark disabled:opacity-60"
    >
      {pending ? "Searching…" : "Search"}
    </button>
  );
}

export function LeadSearchForm({
  action,
  areas,
}: {
  action: (formData: FormData) => Promise<void>;
  areas: { id: string; name: string }[];
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const hasAreas = areas.length > 0;

  return (
    <form
      ref={formRef}
      action={async (formData) => {
        await action(formData);
        formRef.current?.reset();
      }}
      className="flex flex-col gap-3 rounded-lg border-2 border-zinc-900 bg-white p-5"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <div className="flex-1">
          <label htmlFor="query" className="text-sm font-medium text-zinc-700">
            {hasAreas ? "What are you looking for?" : "Search Google Maps"}
          </label>
          <input
            id="query"
            name="query"
            required
            placeholder={hasAreas ? "e.g. general contractors" : "e.g. general contractors near Byron, GA"}
            className={`${inputClass} mt-1 w-full`}
          />
        </div>
        <SearchButton />
      </div>
      {hasAreas && (
        <div>
          <p className="text-sm font-medium text-zinc-700">
            Search these areas (each one is a separate search):
          </p>
          <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1">
            {areas.map((area) => (
              <label key={area.id} className="flex items-center gap-1.5 text-sm text-zinc-600">
                <input
                  type="checkbox"
                  name="areaIds"
                  value={area.id}
                  defaultChecked
                  className="h-4 w-4 rounded border-zinc-300"
                />
                {area.name}
              </label>
            ))}
          </div>
        </div>
      )}
    </form>
  );
}
