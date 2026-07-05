import { Field, inputClass } from "@/components/Field";

type CategoryPricingValues = {
  agingThresholdDays: number;
  basePrice: number | null;
  includedDays: number | null;
  overageDayRate: number | null;
  includedTonnage: number | null;
  overageTonnageRate: number | null;
  includedMileage: number | null;
  overageMileageRate: number | null;
};

function numOrEmpty(value: number | null) {
  return value === null ? "" : String(value);
}

export function CategoryPricingFields({
  initial,
}: {
  initial?: Partial<CategoryPricingValues>;
}) {
  return (
    <div className="flex flex-col gap-4 rounded-xl border border-zinc-200 p-4">
      <h3 className="text-sm font-medium text-zinc-700">
        Dashboard &amp; Pricing Settings
      </h3>

      <Field
        label="Aging Threshold (days before &quot;sitting too long&quot;)"
        htmlFor="agingThresholdDays"
      >
        <input
          id="agingThresholdDays"
          name="agingThresholdDays"
          type="number"
          min="1"
          defaultValue={initial?.agingThresholdDays ?? 14}
          className={inputClass}
        />
      </Field>

      <p className="text-xs text-zinc-500">
        Pricing fields below are optional — leave blank to skip a rule that
        doesn&apos;t apply to this category (e.g. no mileage rule for an
        excavator). Used to auto-calculate invoice line items.
      </p>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Base Price ($)" htmlFor="basePrice">
          <input
            id="basePrice"
            name="basePrice"
            type="number"
            step="0.01"
            defaultValue={numOrEmpty(initial?.basePrice ?? null)}
            className={inputClass}
          />
        </Field>
        <Field label="Included Days" htmlFor="includedDays">
          <input
            id="includedDays"
            name="includedDays"
            type="number"
            defaultValue={numOrEmpty(initial?.includedDays ?? null)}
            className={inputClass}
          />
        </Field>
        <Field label="Overage Rate ($ / extra day)" htmlFor="overageDayRate">
          <input
            id="overageDayRate"
            name="overageDayRate"
            type="number"
            step="0.01"
            defaultValue={numOrEmpty(initial?.overageDayRate ?? null)}
            className={inputClass}
          />
        </Field>
        <Field label="Included Tonnage (tons)" htmlFor="includedTonnage">
          <input
            id="includedTonnage"
            name="includedTonnage"
            type="number"
            step="0.01"
            defaultValue={numOrEmpty(initial?.includedTonnage ?? null)}
            className={inputClass}
          />
        </Field>
        <Field
          label="Overage Rate ($ / extra ton)"
          htmlFor="overageTonnageRate"
        >
          <input
            id="overageTonnageRate"
            name="overageTonnageRate"
            type="number"
            step="0.01"
            defaultValue={numOrEmpty(initial?.overageTonnageRate ?? null)}
            className={inputClass}
          />
        </Field>
        <Field label="Included Mileage (mi)" htmlFor="includedMileage">
          <input
            id="includedMileage"
            name="includedMileage"
            type="number"
            step="0.1"
            defaultValue={numOrEmpty(initial?.includedMileage ?? null)}
            className={inputClass}
          />
        </Field>
        <Field
          label="Overage Rate ($ / extra mile)"
          htmlFor="overageMileageRate"
        >
          <input
            id="overageMileageRate"
            name="overageMileageRate"
            type="number"
            step="0.01"
            defaultValue={numOrEmpty(initial?.overageMileageRate ?? null)}
            className={inputClass}
          />
        </Field>
      </div>
    </div>
  );
}
