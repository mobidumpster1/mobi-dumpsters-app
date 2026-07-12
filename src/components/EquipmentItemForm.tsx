"use client";

import { useState } from "react";
import Link from "next/link";
import { Field, inputClass } from "@/components/Field";
import { SearchableSelect } from "@/components/SearchableSelect";
import { ImageUploadField } from "@/components/ImageUploadField";
import { quickAddCategory } from "@/app/(internal)/equipment/categories/actions";
import type { FieldDefinition } from "@/lib/categoryFields";

type CategoryOption = {
  id: string;
  name: string;
  fieldDefinitions: FieldDefinition[];
  imageUrl: string | null;
  dimensions: string | null;
  basePrice: number | null;
  hasPricingTiers: boolean;
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
  const [categoryOptions, setCategoryOptions] = useState(categories);
  const [categoryId, setCategoryId] = useState(
    initial?.categoryId ?? categories[0]?.id ?? ""
  );
  const selectedCategory = categoryOptions.find((c) => c.id === categoryId);
  const fieldDefs = selectedCategory?.fieldDefinitions ?? [];

  const [showAddCategory, setShowAddCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [addingCategory, setAddingCategory] = useState(false);
  const [addCategoryError, setAddCategoryError] = useState<string | null>(null);

  async function handleAddCategory() {
    if (!newCategoryName.trim()) {
      setAddCategoryError("Name is required");
      return;
    }
    setAddingCategory(true);
    setAddCategoryError(null);
    try {
      const formData = new FormData();
      formData.set("name", newCategoryName);
      const category = await quickAddCategory(formData);
      setCategoryOptions((prev) =>
        prev.some((c) => c.id === category.id)
          ? prev
          : [
              ...prev,
              {
                ...category,
                fieldDefinitions: [],
                imageUrl: null,
                dimensions: null,
                basePrice: null,
                hasPricingTiers: false,
              },
            ].sort((a, b) => a.name.localeCompare(b.name))
      );
      setCategoryId(category.id);
      setShowAddCategory(false);
      setNewCategoryName("");
    } catch (err) {
      setAddCategoryError(err instanceof Error ? err.message : "Couldn't add that category");
    } finally {
      setAddingCategory(false);
    }
  }

  return (
    <form action={action} className="flex flex-col gap-4">
      <Field label="Category" htmlFor="categoryId">
        <div className="flex flex-col gap-2">
          <div className="flex gap-2">
            <div className="flex-1">
              <SearchableSelect
                id="categoryId"
                name="categoryId"
                required
                placeholder="Search rental types…"
                value={categoryId}
                onChange={setCategoryId}
                options={categoryOptions.map((category) => ({
                  id: category.id,
                  label: category.name,
                }))}
              />
            </div>
            <button
              type="button"
              onClick={() => setShowAddCategory((v) => !v)}
              className="flex-shrink-0 rounded-xl border border-zinc-300 px-4 py-2 text-sm font-semibold text-zinc-700 transition-colors hover:bg-zinc-50"
            >
              {showAddCategory ? "Cancel" : "+ New Category"}
            </button>
          </div>

          {showAddCategory && (
            <div className="flex flex-col gap-2 rounded-xl border border-zinc-200 bg-zinc-50 p-3">
              <p className="text-xs text-zinc-500">
                Adds a new rental type with just a name — you can set its photo,
                price, and dimensions below once it's selected.
              </p>
              <input
                placeholder="e.g. Skid Steer"
                className={inputClass}
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
              />
              {addCategoryError && (
                <p className="text-sm text-red-600">{addCategoryError}</p>
              )}
              <button
                type="button"
                onClick={handleAddCategory}
                disabled={addingCategory}
                className="self-start rounded-lg bg-brand px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-brand-dark disabled:opacity-60"
              >
                {addingCategory ? "Adding…" : "Add Category"}
              </button>
            </div>
          )}
        </div>
      </Field>

      {selectedCategory && (
        <div
          key={categoryId}
          className="rounded-xl border border-zinc-200 bg-zinc-50 p-4"
        >
          <h3 className="text-sm font-medium text-zinc-700">
            {selectedCategory.name}: Photo, Price &amp; Dimensions
          </h3>
          <p className="mt-0.5 text-xs text-zinc-500">
            Shown to customers on the booking page. Applies to every{" "}
            {selectedCategory.name} item, not just this one.
          </p>
          <div className="mt-3 flex flex-col gap-3">
            <ImageUploadField
              name="categoryImageUrl"
              label="Photo"
              initialUrl={selectedCategory.imageUrl}
              folder={`categories/${categoryId}`}
            />
            {selectedCategory.hasPricingTiers ? (
              <p className="text-xs text-zinc-500">
                This category uses tiered pricing — edit price tiers from
                Equipment → Categories.
              </p>
            ) : (
              <Field label="Price ($)" htmlFor="categoryBasePrice">
                <input
                  id="categoryBasePrice"
                  name="categoryBasePrice"
                  type="number"
                  step="any"
                  min="0"
                  defaultValue={selectedCategory.basePrice ?? ""}
                  className={inputClass}
                />
              </Field>
            )}
            <Field label="Dimensions" htmlFor="categoryDimensions">
              <input
                id="categoryDimensions"
                name="categoryDimensions"
                placeholder={`e.g. 16' L x 7' W x 4.5' H`}
                defaultValue={selectedCategory.dimensions ?? ""}
                className={inputClass}
              />
            </Field>
          </div>
        </div>
      )}

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
