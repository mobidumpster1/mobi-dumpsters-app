import Link from "next/link";
import { importCustomersFromCsv } from "../importActions";

export default function ImportCustomersPage() {
  return (
    <div className="max-w-xl">
      <h1 className="text-3xl font-black tracking-tight text-ink">Import Customers</h1>
      <p className="mt-1 text-sm text-zinc-500">
        Upload a CSV with a header row. Only <strong>Name</strong> is required — Company,
        Phone, Email, Address, Notes, and Tags (comma-separated within the cell) are all
        optional and matched by column name, in any order.
      </p>
      <form
        action={importCustomersFromCsv}
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
            href="/customers"
            className="rounded-xl border border-zinc-300 px-5 py-3 text-sm font-semibold text-zinc-700 transition-colors hover:bg-zinc-50"
          >
            Cancel
          </Link>
        </div>
      </form>
    </div>
  );
}
