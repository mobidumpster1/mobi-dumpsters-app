import { getValidConnection, isQuickBooksConfigured, listAccounts, type QboAccount } from "@/lib/quickbooks";
import { saveAccountMappings, disconnectQuickBooks, importCustomersFromQuickBooks, updateAgreementSettings } from "./actions";
import { getAgreementSettings } from "@/lib/agreement";
import { Field, inputClass } from "@/components/Field";

export const dynamic = "force-dynamic";

function accountOptionValue(account: QboAccount) {
  return `${account.Id}|||${account.Name}`;
}

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ qb_connected?: string; qb_error?: string }>;
}) {
  const { qb_connected, qb_error } = await searchParams;
  const configured = isQuickBooksConfigured();
  const connection = configured ? await getValidConnection() : null;
  const agreement = await getAgreementSettings();

  let accounts: QboAccount[] = [];
  if (connection) {
    try {
      accounts = await listAccounts(connection);
    } catch (error) {
      console.error("Failed to load QuickBooks accounts:", error);
    }
  }

  return (
    <div className="max-w-2xl">
      <h1 className="text-3xl font-bold tracking-tight text-ink">Settings</h1>

      <section className="mt-6 rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
        <h2 className="text-xl font-semibold text-ink">QuickBooks Online</h2>

        {qb_connected && (
          <p className="mt-3 rounded-xl bg-green-50 px-4 py-3 text-sm text-green-700">
            Connected to QuickBooks successfully.
          </p>
        )}
        {qb_error && (
          <p className="mt-3 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
            Something went wrong connecting to QuickBooks ({qb_error}). Try again.
          </p>
        )}

        {!configured && (
          <p className="mt-3 text-zinc-500">
            QuickBooks isn&apos;t set up yet. Add your Intuit Developer Client ID,
            Client Secret, and redirect URL to the app&apos;s environment settings,
            then refresh this page.
          </p>
        )}

        {configured && !connection && (
          <div className="mt-4">
            <p className="text-zinc-500">Not connected yet.</p>
            <a
              href="/api/quickbooks/connect"
              className="mt-3 inline-block rounded-xl bg-brand px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-brand-dark"
            >
              Connect to QuickBooks
            </a>
          </div>
        )}

        {configured && connection && (
          <div className="mt-4 flex flex-col gap-6">
            <p className="text-sm text-zinc-500">
              Connected (
              {connection.environment === "production" ? "live" : "sandbox / test"}{" "}
              account).
            </p>

            <form action={saveAccountMappings} className="flex flex-col gap-4">
              <Field
                label="Deposit Account (where payments land)"
                htmlFor="depositAccount"
              >
                <select
                  id="depositAccount"
                  name="depositAccount"
                  defaultValue={
                    connection.defaultDepositAccountId
                      ? `${connection.defaultDepositAccountId}|||${connection.defaultDepositAccountName}`
                      : ""
                  }
                  className={inputClass}
                >
                  <option value="">Select an account…</option>
                  {accounts.map((a) => (
                    <option key={a.Id} value={accountOptionValue(a)}>
                      {a.Name} ({a.AccountType})
                    </option>
                  ))}
                </select>
              </Field>
              <Field
                label="Income Account (for rental revenue)"
                htmlFor="incomeAccount"
              >
                <select
                  id="incomeAccount"
                  name="incomeAccount"
                  defaultValue={
                    connection.defaultIncomeAccountId
                      ? `${connection.defaultIncomeAccountId}|||${connection.defaultIncomeAccountName}`
                      : ""
                  }
                  className={inputClass}
                >
                  <option value="">Select an account…</option>
                  {accounts.map((a) => (
                    <option key={a.Id} value={accountOptionValue(a)}>
                      {a.Name} ({a.AccountType})
                    </option>
                  ))}
                </select>
              </Field>
              <Field
                label="Expense Category Account (for bills/fuel/etc.)"
                htmlFor="expenseAccount"
              >
                <select
                  id="expenseAccount"
                  name="expenseAccount"
                  defaultValue={
                    connection.defaultExpenseAccountId
                      ? `${connection.defaultExpenseAccountId}|||${connection.defaultExpenseAccountName}`
                      : ""
                  }
                  className={inputClass}
                >
                  <option value="">Select an account…</option>
                  {accounts.map((a) => (
                    <option key={a.Id} value={accountOptionValue(a)}>
                      {a.Name} ({a.AccountType})
                    </option>
                  ))}
                </select>
              </Field>
              <div>
                <button
                  type="submit"
                  className="rounded-xl bg-brand px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-brand-dark"
                >
                  Save Mappings
                </button>
              </div>
            </form>

            <div className="flex gap-3 border-t border-zinc-100 pt-4">
              <form action={importCustomersFromQuickBooks}>
                <button
                  type="submit"
                  className="rounded-xl border border-zinc-300 px-5 py-3 text-sm font-semibold text-zinc-700 transition-colors hover:bg-zinc-50"
                >
                  Import Customers from QuickBooks
                </button>
              </form>
              <form action={disconnectQuickBooks}>
                <button
                  type="submit"
                  className="rounded-xl border border-zinc-300 px-5 py-3 text-sm font-semibold text-red-600 transition-colors hover:bg-red-50"
                >
                  Disconnect
                </button>
              </form>
            </div>
          </div>
        )}
      </section>

      <section className="mt-6 rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
        <h2 className="text-xl font-semibold text-ink">Service Agreement</h2>
        <p className="mt-1 text-sm text-zinc-500">
          Shown to customers before they can book online, and on the
          shareable signing link. Edit this to your real terms — consider
          having a lawyer review it before sharing with real customers.
        </p>

        {agreement.content.startsWith("[Placeholder") && (
          <p className="mt-3 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-800">
            Still using placeholder text — customers can technically sign
            this, but it isn&apos;t a real agreement yet.
          </p>
        )}

        <form
          action={updateAgreementSettings}
          className="mt-4 flex flex-col gap-4"
        >
          <Field label="Title" htmlFor="title">
            <input
              id="title"
              name="title"
              defaultValue={agreement.title}
              required
              className={inputClass}
            />
          </Field>
          <Field label="Agreement Text" htmlFor="content">
            <textarea
              id="content"
              name="content"
              rows={12}
              defaultValue={agreement.content}
              required
              className={inputClass}
            />
          </Field>
          <div className="flex items-center gap-3">
            <button
              type="submit"
              className="rounded-xl bg-brand px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-brand-dark"
            >
              Save Agreement Text
            </button>
            <a
              href="/agreement/sign"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm font-semibold text-brand hover:underline"
            >
              Preview shareable signing link →
            </a>
          </div>
        </form>
      </section>
    </div>
  );
}
