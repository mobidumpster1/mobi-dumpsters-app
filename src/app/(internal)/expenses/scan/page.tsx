import Link from "next/link";
import { scanReceipt } from "../scanActions";
import { Field, inputClass } from "@/components/Field";
import { isReceiptScanConfigured } from "@/lib/receiptScan";

export default function ScanReceiptPage() {
  const configured = isReceiptScanConfigured();

  return (
    <div className="max-w-xl">
      <h1 className="text-3xl font-black tracking-tight text-ink">
        Scan Receipt
      </h1>
      <p className="mt-1 text-zinc-500">
        Take a photo of a receipt and we&apos;ll read the vendor, amount, date,
        and category automatically, and create the expense for you. You&apos;ll
        land on an edit screen to double-check everything before it&apos;s
        final.
      </p>

      {!configured ? (
        <p className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-800">
          Receipt scanning isn&apos;t set up yet. Add an{" "}
          <code className="rounded bg-amber-100 px-1">ANTHROPIC_API_KEY</code>{" "}
          to the app&apos;s environment settings, then reload this page.
        </p>
      ) : (
        <form
          action={scanReceipt}
          className="mt-6 flex flex-col gap-4 rounded-lg border-2 border-zinc-900 bg-white p-5"
        >
          <Field label="Receipt Photo" htmlFor="file">
            <input
              id="file"
              name="file"
              type="file"
              accept="image/*"
              capture="environment"
              required
              className={inputClass}
            />
          </Field>
          <div>
            <button
              type="submit"
              className="rounded-lg bg-brand px-5 py-3 text-sm font-bold text-white transition-colors hover:bg-brand-dark"
            >
              Scan &amp; File Expense
            </button>
          </div>
        </form>
      )}

      <Link
        href="/expenses"
        className="mt-4 inline-block text-sm text-zinc-500 hover:underline"
      >
        ← Back to Expenses
      </Link>
    </div>
  );
}
