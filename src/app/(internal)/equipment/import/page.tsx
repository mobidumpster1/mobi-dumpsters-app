import Link from "next/link";
import { importEquipmentFromCsv } from "../importActions";

export default function ImportEquipmentPage() {
  return (
    <div className="max-w-xl">
      <h1 className="text-3xl font-black tracking-tight text-ink">Import Equipment</h1>
      <p className="mt-1 text-sm text-zinc-500">
        Upload a CSV with a header row. <strong>Label</strong> and <strong>Category</strong> are
        required — Category must match an existing rental type&apos;s name exactly (case
        doesn&apos;t matter); a row with an unrecognized category is skipped rather than
        creating a new rental type from a typo. Asset Tag, Current Location, and Notes are
        optional. New items are created with status &quot;Available.&quot;
      </p>
      <form
        action={importEquipmentFromCsv}
        className="mt-6 flex flex-col gap-4 rounded-lg border-2 border-zinc-900 bg-white p-5"
      >
        <input
          type="file"
          name="file"
          accept=".csv,text/csv"
          required
          className="text-sm text-zinc-700"
        />
        <div className="flex gap-3">
          <button
            type="submit"
            className="rounded-lg bg-brand px-5 py-3 text-sm font-bold text-white transition-colors hover:bg-brand-dark"
          >
            Import
          </button>
          <Link
            href="/equipment"
            className="rounded-xl border border-zinc-300 px-5 py-3 text-sm font-semibold text-zinc-700 transition-colors hover:bg-zinc-50"
          >
            Cancel
          </Link>
        </div>
      </form>
    </div>
  );
}
