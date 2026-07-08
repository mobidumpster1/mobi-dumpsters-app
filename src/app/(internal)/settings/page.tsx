import { getValidConnection, isQuickBooksConfigured, listAccounts, type QboAccount } from "@/lib/quickbooks";
import {
  saveAccountMappings,
  disconnectQuickBooks,
  importCustomersFromQuickBooks,
  updateAgreementSettings,
  updateReviewRequestSettings,
  sendReviewRequestsNow,
  updateInvoiceReminderSettings,
  sendInvoiceRemindersNow,
  updateJobNotificationSettings,
  updateDeliveryReminderSettings,
  sendDeliveryRemindersNow,
  saveEmailTemplate,
  resetEmailTemplateToDefault,
} from "./actions";
import { getAgreementSettings } from "@/lib/agreement";
import { getReviewRequestSettings } from "@/lib/reviewSettings";
import { getInvoiceReminderSettings } from "@/lib/invoiceReminderSettings";
import { getJobNotificationSettings } from "@/lib/jobNotificationSettings";
import { getDeliveryReminderSettings } from "@/lib/deliveryReminderSettings";
import { getAllEmailTemplates } from "@/lib/emailTemplates";
import { Field, inputClass } from "@/components/Field";
import { serviceAreas } from "@/lib/serviceAreas";
import { EmailTemplateCard } from "@/components/EmailTemplateCard";

export const dynamic = "force-dynamic";

function accountOptionValue(account: QboAccount) {
  return `${account.Id}|||${account.Name}`;
}

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{
    qb_connected?: string;
    qb_error?: string;
    reviews_sent?: string;
    reviews_checked?: string;
    invoices_sent?: string;
    invoices_checked?: string;
    deliveries_sent?: string;
    deliveries_checked?: string;
  }>;
}) {
  const {
    qb_connected,
    qb_error,
    reviews_sent,
    reviews_checked,
    invoices_sent,
    invoices_checked,
    deliveries_sent,
    deliveries_checked,
  } = await searchParams;
  const configured = isQuickBooksConfigured();
  const connection = configured ? await getValidConnection() : null;
  const agreement = await getAgreementSettings();
  const reviewSettings = await getReviewRequestSettings();
  const invoiceReminderSettings = await getInvoiceReminderSettings();
  const jobNotificationSettings = await getJobNotificationSettings();
  const deliveryReminderSettings = await getDeliveryReminderSettings();
  const emailTemplates = await getAllEmailTemplates();

  let accounts: QboAccount[] = [];
  let accountsError: string | null = null;
  if (connection) {
    try {
      accounts = await listAccounts(connection);
    } catch (error) {
      console.error("Failed to load QuickBooks accounts:", error);
      accountsError = error instanceof Error ? error.message : String(error);
    }
  }

  return (
    <div className="max-w-2xl">
      <h1 className="text-3xl font-bold tracking-tight text-ink">Settings</h1>

      <section className="mt-6 rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
        <h2 className="text-xl font-semibold text-ink">QuickBooks Online</h2>

        {accountsError && (
          <p className="mt-3 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700 break-all">
            Couldn&apos;t load your Chart of Accounts from QuickBooks: {accountsError}
          </p>
        )}

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

      <section className="mt-6 rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
        <h2 className="text-xl font-semibold text-ink">Review Requests</h2>
        <p className="mt-1 text-sm text-zinc-500">
          Automatically emails a customer a few days after a job is fully
          picked up, asking for a Google review. Runs once a day — a booking
          only ever gets asked once.
        </p>

        {reviews_sent !== undefined && (
          <p className="mt-3 rounded-xl bg-green-50 px-4 py-3 text-sm text-green-700">
            Sent {reviews_sent} review request{reviews_sent === "1" ? "" : "s"}
            {reviews_checked ? ` (checked ${reviews_checked} eligible job${reviews_checked === "1" ? "" : "s"}).` : "."}
          </p>
        )}

        <form action={updateReviewRequestSettings} className="mt-4 flex flex-col gap-4">
          <Field
            label="Google Review Link"
            htmlFor="googleReviewUrl"
          >
            <input
              id="googleReviewUrl"
              name="googleReviewUrl"
              type="url"
              placeholder="https://g.page/r/.../review"
              defaultValue={reviewSettings.googleReviewUrl ?? ""}
              className={inputClass}
            />
          </Field>
          <p className="-mt-2 text-xs text-zinc-500">
            Find this on your Google Business Profile under &quot;Get more
            reviews&quot; — it gives you a shareable link.
          </p>
          <Field label="Send this many days after pickup" htmlFor="delayDays">
            <input
              id="delayDays"
              name="delayDays"
              type="number"
              min="0"
              step="1"
              defaultValue={reviewSettings.delayDays}
              className={inputClass}
            />
          </Field>
          <label className="flex items-center gap-2 text-sm font-medium text-zinc-700">
            <input
              type="checkbox"
              name="enabled"
              defaultChecked={reviewSettings.enabled}
              className="h-4 w-4 rounded border-zinc-300"
            />
            Send review request emails automatically
          </label>
          <div>
            <button
              type="submit"
              className="rounded-xl bg-brand px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-brand-dark"
            >
              Save
            </button>
          </div>
        </form>

        <form action={sendReviewRequestsNow} className="mt-4 border-t border-zinc-100 pt-4">
          <button
            type="submit"
            className="rounded-xl border border-zinc-300 px-5 py-3 text-sm font-semibold text-zinc-700 transition-colors hover:bg-zinc-50"
          >
            Send Now (check for anyone eligible today)
          </button>
        </form>
      </section>

      <section className="mt-6 rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
        <h2 className="text-xl font-semibold text-ink">Overdue Invoice Reminders</h2>
        <p className="mt-1 text-sm text-zinc-500">
          Automatically emails a customer when an invoice is past due, then
          nags again periodically until it&apos;s paid. Runs once a day.
        </p>

        {invoices_sent !== undefined && (
          <p className="mt-3 rounded-xl bg-green-50 px-4 py-3 text-sm text-green-700">
            Sent {invoices_sent} reminder{invoices_sent === "1" ? "" : "s"}
            {invoices_checked ? ` (checked ${invoices_checked} overdue invoice${invoices_checked === "1" ? "" : "s"}).` : "."}
          </p>
        )}

        <form action={updateInvoiceReminderSettings} className="mt-4 flex flex-col gap-4">
          <Field label="Send the first reminder this many days past due" htmlFor="delayDays">
            <input
              id="delayDays"
              name="delayDays"
              type="number"
              min="0"
              step="1"
              defaultValue={invoiceReminderSettings.delayDays}
              className={inputClass}
            />
          </Field>
          <Field label="Then repeat every this many days while still unpaid" htmlFor="repeatDays">
            <input
              id="repeatDays"
              name="repeatDays"
              type="number"
              min="1"
              step="1"
              defaultValue={invoiceReminderSettings.repeatDays}
              className={inputClass}
            />
          </Field>
          <label className="flex items-center gap-2 text-sm font-medium text-zinc-700">
            <input
              type="checkbox"
              name="enabled"
              defaultChecked={invoiceReminderSettings.enabled}
              className="h-4 w-4 rounded border-zinc-300"
            />
            Send overdue reminder emails automatically
          </label>
          <div>
            <button
              type="submit"
              className="rounded-xl bg-brand px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-brand-dark"
            >
              Save
            </button>
          </div>
        </form>

        <form action={sendInvoiceRemindersNow} className="mt-4 border-t border-zinc-100 pt-4">
          <button
            type="submit"
            className="rounded-xl border border-zinc-300 px-5 py-3 text-sm font-semibold text-zinc-700 transition-colors hover:bg-zinc-50"
          >
            Send Now (check for anyone overdue today)
          </button>
        </form>
      </section>

      <section className="mt-6 rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
        <h2 className="text-xl font-semibold text-ink">Job Notifications</h2>
        <p className="mt-1 text-sm text-zinc-500">
          Keep customers posted around a job — when equipment goes out, when
          it comes back, and a heads-up before it's dropped off.
        </p>

        <form action={updateJobNotificationSettings} className="mt-4 flex flex-col gap-3 border-t border-zinc-100 pt-4">
          <p className="text-sm font-medium text-ink">Delivery &amp; Pickup</p>
          <label className="flex items-center gap-2 text-sm font-medium text-zinc-700">
            <input
              type="checkbox"
              name="enabled"
              defaultChecked={jobNotificationSettings.enabled}
              className="h-4 w-4 rounded border-zinc-300"
            />
            Email the customer automatically when equipment is delivered or
            picked up (includes the dump weight when it&apos;s recorded)
          </label>
          <div>
            <button
              type="submit"
              className="rounded-xl bg-brand px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-brand-dark"
            >
              Save
            </button>
          </div>
        </form>

        <div className="mt-6 border-t border-zinc-100 pt-4">
          <p className="text-sm font-medium text-ink">Delivery Reminder</p>

          {deliveries_sent !== undefined && (
            <p className="mt-3 rounded-xl bg-green-50 px-4 py-3 text-sm text-green-700">
              Sent {deliveries_sent} reminder{deliveries_sent === "1" ? "" : "s"}
              {deliveries_checked ? ` (checked ${deliveries_checked} upcoming ${deliveries_checked === "1" ? "delivery" : "deliveries"}).` : "."}
            </p>
          )}

          <form action={updateDeliveryReminderSettings} className="mt-3 flex flex-col gap-4">
            <Field label="Send this many hours before delivery" htmlFor="hoursBefore">
              <input
                id="hoursBefore"
                name="hoursBefore"
                type="number"
                min="1"
                step="1"
                defaultValue={deliveryReminderSettings.hoursBefore}
                className={inputClass}
              />
            </Field>
            <label className="flex items-center gap-2 text-sm font-medium text-zinc-700">
              <input
                type="checkbox"
                name="enabled"
                defaultChecked={deliveryReminderSettings.enabled}
                className="h-4 w-4 rounded border-zinc-300"
              />
              Send delivery reminder emails automatically
            </label>
            <div>
              <button
                type="submit"
                className="rounded-xl bg-brand px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-brand-dark"
              >
                Save
              </button>
            </div>
          </form>

          <form action={sendDeliveryRemindersNow} className="mt-4 border-t border-zinc-100 pt-4">
            <button
              type="submit"
              className="rounded-xl border border-zinc-300 px-5 py-3 text-sm font-semibold text-zinc-700 transition-colors hover:bg-zinc-50"
            >
              Send Now (check for upcoming deliveries)
            </button>
          </form>
        </div>
      </section>

      <section className="mt-6 rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
        <h2 className="text-xl font-semibold text-ink">Email Templates</h2>
        <p className="mt-1 text-sm text-zinc-500">
          Customize the wording of any automated customer email. Leave a
          template alone and it uses the default wording shown here.
        </p>
        <div className="mt-4 flex flex-col gap-2">
          {emailTemplates.map((t) => (
            <EmailTemplateCard
              key={t.key}
              templateKey={t.key}
              label={t.label}
              description={t.description}
              placeholders={t.placeholders}
              subject={t.subject}
              body={t.body}
              isCustomized={t.isCustomized}
              saveAction={saveEmailTemplate.bind(null, t.key)}
              resetAction={resetEmailTemplateToDefault.bind(null, t.key)}
            />
          ))}
        </div>
      </section>

      <section className="mt-6 rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
        <h2 className="text-xl font-semibold text-ink">SEO City Pages</h2>
        <p className="mt-1 text-sm text-zinc-500">
          Public pages for search engines — not part of the internal app
          navigation. Good to link from your real website and Google
          Business Profile.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          {serviceAreas.map((area) => (
            <a
              key={area.slug}
              href={`/dumpster-rental/${area.slug}`}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-full border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50"
            >
              {area.city}, GA →
            </a>
          ))}
        </div>
      </section>
    </div>
  );
}
