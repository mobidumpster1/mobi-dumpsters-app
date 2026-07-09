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
      className="rounded-xl bg-brand px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-brand-dark disabled:opacity-60"
    >
      {pending ? "Searching…" : "Search"}
    </button>
  );
}

export function LeadSearchForm({
  action,
  hasAreas,
}: {
  action: (formData: FormData) => Promise<void>;
  hasAreas: boolean;
}) {
  const formRef = useRef<HTMLFormElement>(null);

  return (
    <form
      ref={formRef}
      action={async (formData) => {
        await action(formData);
        formRef.current?.reset();
      }}
      className="flex flex-col gap-3 rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm sm:flex-row sm:items-end"
    >
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
    </form>
  );
}
