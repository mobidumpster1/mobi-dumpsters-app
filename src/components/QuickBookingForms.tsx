import { inputClass } from "@/components/Field";

const smallInput = `${inputClass} w-24 px-3 py-2 text-sm`;

// "Enter the scale ticket" — shown wherever a load has come back but its
// dump weight hasn't been entered yet. `items` is only passed when more than
// one returned item is waiting, so the person can say which one the ticket
// is for.
export function LogWeightForm({
  action,
  items,
}: {
  action: (formData: FormData) => void | Promise<void>;
  items?: { id: string; label: string }[];
}) {
  return (
    <form action={action} className="flex flex-wrap items-end gap-2">
      {items && items.length > 1 && (
        <label className="flex flex-col gap-0.5 text-xs font-semibold text-zinc-600">
          Which one
          <select name="itemId" required className={`${inputClass} px-3 py-2 text-sm`}>
            {items.map((item) => (
              <option key={item.id} value={item.id}>
                {item.label}
              </option>
            ))}
          </select>
        </label>
      )}
      <label className="flex flex-col gap-0.5 text-xs font-semibold text-zinc-600">
        Weight (tons)
        <input type="number" name="weightTons" step="0.01" min="0.01" required inputMode="decimal" className={smallInput} />
      </label>
      <label className="flex flex-col gap-0.5 text-xs font-semibold text-zinc-600">
        Dump fee (optional)
        <input type="number" name="fee" step="0.01" min="0" inputMode="decimal" className={smallInput} />
      </label>
      <button
        type="submit"
        className="min-h-11 rounded-xl bg-accent px-4 text-sm font-extrabold text-accent-ink transition-all hover:brightness-105"
      >
        Save weight
      </button>
    </form>
  );
}

// "Give them N more days." Moves the return date out and lets the invoice
// pick up the extra days.
export function ExtendForm({
  action,
  submitLabel = "Extend",
  defaultDays = 1,
}: {
  action: (formData: FormData) => void | Promise<void>;
  submitLabel?: string;
  defaultDays?: number;
}) {
  return (
    <form action={action} className="flex flex-wrap items-end gap-2">
      <label className="flex flex-col gap-0.5 text-xs font-semibold text-zinc-600">
        Extra days
        <input
          type="number"
          name="days"
          min="1"
          max="60"
          step="1"
          defaultValue={defaultDays}
          required
          inputMode="numeric"
          className={smallInput}
        />
      </label>
      <button
        type="submit"
        className="min-h-11 rounded-xl border-2 border-brand px-4 text-sm font-bold text-brand-fg transition-colors hover:bg-brand/10"
      >
        {submitLabel}
      </button>
    </form>
  );
}
