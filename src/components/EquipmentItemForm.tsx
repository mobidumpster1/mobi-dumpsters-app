"use client";

import { useState } from "react";
import Link from "next/link";
import { Field, inputClass } from "@/components/Field";
import { SearchableSelect } from "@/components/SearchableSelect";
import type { FieldDefinition } from "@/lib/categoryFields";

type CategoryOption = {
  id: string;
  name: string;
  fieldDefinitions: FieldDefinition[];
};

type CustomerOption = { id: string; name: string };

export function EquipmentItemForm({
  action,
  categories,
  customers,
  cancelHref,
  initial,
}: {
  action: (formData: FormData) => void;
  categories: CategoryOption[];
  customers: CustomerOption[];
  cancelHref: string;
  initial?: {
    categoryId: string;
    label: string;
    assetTag: string;
    status: string;
    currentLocation: string;
    currentCustomerId: string;
    notes: string;
    attributes: Record<string, unknown>;
  };
}) {
  const [categoryId, setCategoryId] = useState(
    initial?.categoryId ?? categories[0]?.id ?? ""
  );
  const selectedCategory = categories.find((c) => c.id === categoryId);
  const fieldDefs = selectedCategory?.fieldDefinitions ?? [];

  return (
    <form action={action} className="flex flex-col gap-4">
      <Field label="Category" htmlFor="categoryId">
        <SearchableSelect
          id="categoryId"
          name="categoryId"
          required
          placeholder="Search rental types…"
          value={categoryId}
          onChange={setCategoryId}
          options={categories.map((category) => ({ id: category.id, label: category.name }))}
        />
      </Field>

      <Field label="Label" htmlFor="label">
        <input
          id="label"
          name="label"
          required
          defaultValue={initial?.label}
          placeholder="e.g. Dumpster #3"
          className={inputClass}
        />
      </Field>

      <Field label="Asset Tag / Serial (optional)" htmlFor="assetTag">
        <input
          id="assetTag"
          name="assetTag"
          defaultValue={initial?.assetTag}
          className={inputClass}
        />
      </Field>

      <Field label="Status" htmlFor="status">
        <select
          id="status"
          name="status"
          defaultValue={initial?.status ?? "available"}
          className={inputClass}
        >
          <option value="available">Available</option>
          <option value="reserved">Reserved</option>
          <option value="out_on_job">Out on Job</option>
          <option value="in_transit">In Transit</option>
          <option value="needs_repair">Needs Repair</option>
          <option value="retired">Retired</option>
        </select>
      </Field>

      <Field label="Current Location" htmlFor="currentLocation">
        <input
          id="currentLocation"
          name="currentLocation"
          placeholder="e.g. Yard, or a job address"
          defaultValue={initial?.currentLocation}
          className={inputClass}
        />
      </Field>

      <Field label="Current Customer (optional)" htmlFor="currentCustomerId">
        <select
          id="currentCustomerId"
          name="currentCustomerId"
          defaultValue={initial?.currentCustomerId ?? ""}
          className={inputClass}
        >
          <option value="">None</option>
          {customers.map((customer) => (
            <option key={customer.id} value={customer.id}>
              {customer.name}
            </option>
          ))}
        </select>
      </Field>

      {fieldDefs.length > 0 && (
        <div className="rounded-xl border border-zinc-200 p-4">
          <h3 className="mb-3 text-sm font-medium text-zinc-700">
            {selectedCategory?.name} Details
          </h3>
          <div className="flex flex-col gap-3">
            {fieldDefs.map((field) => (
              <Field
                key={field.key}
                label={`${field.label}${field.unit ? ` (${field.unit})` : ""}`}
                htmlFor={`attr_${field.key}`}
              >
                {field.type === "boolean" ? (
                  <input
                    id={`attr_${field.key}`}
                    name={`attr_${field.key}`}
                    type="checkbox"
                    defaultChecked={Boolean(initial?.attributes[field.key])}
                    className="h-4 w-4"
                  />
                ) : field.type === "select" ? (
                  <select
                    id={`attr_${field.key}`}
                    name={`attr_${field.key}`}
                    defaultValue={String(initial?.attributes[field.key] ?? "")}
                    required={field.required}
                    className={inputClass}
                  >
                    <option value="">Select…</option>
                    {(field.options ?? []).map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    id={`attr_${field.key}`}
                    name={`attr_${field.key}`}
                    type={
                      field.type === "number"
                        ? "number"
                        : field.type === "date"
                          ? "date"
                          : "text"
                    }
                    step={field.type === "number" ? "any" : undefined}
                    required={field.required}
                    defaultValue={String(initial?.attributes[field.key] ?? "")}
                    className={inputClass}
                  />
                )}
              </Field>
            ))}
          </div>
        </div>
      )}

      <Field label="Notes" htmlFor="notes">
        <textarea
          id="notes"
          name="notes"
          rows={3}
          defaultValue={initial?.notes}
          className={inputClass}
        />
      </Field>

      <div className="flex gap-3">
        <button
          type="submit"
          className="rounded-lg bg-brand px-5 py-3 text-sm font-bold text-white transition-colors hover:bg-brand-dark"
        >
          Save Equipment
        </button>
        <Link
          href={cancelHref}
          className="rounded-xl border border-zinc-300 px-5 py-3 text-sm font-semibold text-zinc-700 transition-colors hover:bg-zinc-50"
        >
          Cancel
        </Link>
      </div>
    </form>
  );
}
