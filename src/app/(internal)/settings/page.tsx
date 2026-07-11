import { redirect } from "next/navigation";
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
  updateWinBackSettings,
  addPermitArea,
  removePermitArea,
} from "./actions";
import { addStaffUser, updateStaffPermissions, setStaffActive } from "./staffActions";
import { setPlatformAdmin } from "../platform-admin/actions";
import { getAgreementSettings } from "@/lib/agreement";
import { getReviewRequestSettings } from "@/lib/reviewSettings";
import { getInvoiceReminderSettings } from "@/lib/invoiceReminderSettings";
import { getJobNotificationSettings } from "@/lib/jobNotificationSettings";
import { getDeliveryReminderSettings } from "@/lib/deliveryReminderSettings";
import { getWinBackSettings } from "@/lib/winbackSettings";
import { getAllEmailTemplates } from "@/lib/emailTemplates";
import { Field, inputClass } from "@/components/Field";
import { serviceAreas } from "@/lib/serviceAreas";
import { EmailTemplateCard } from "@/components/EmailTemplateCard";
import { CopyLinkButton } from "@/components/CopyLinkButton";
import { ConfirmButton } from "@/components/ConfirmButton";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/session";

export const dynamic = "force-dynamic";

const PERMISSION_OPTIONS = [
  { key: "canManageInvoices", label: "Manage invoices (create/edit, mark paid, send payment links)" },
  { key: "canDeleteRecords", label: "Delete records (bookings, customers, equipment, invoices, leads)" },
  { key: "canManageExpenses", label: "Manage expenses & recurring bills" },
  { key: "canViewReports", label: "View profit reports" },
  { key: "canManageLeads", label: "Manage Leads & Win-Back outreach" },
] as const;

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
  const currentUser = await requireUser();
  if (currentUser.role !== "owner") redirect("/");

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
  const staffUsers = await db.user.findMany({
    where: { organizationId: currentUser.effectiveOrganizationId },
    orderBy: { createdAt: "asc" },
  });
  const connection = configured ? await getValidConnection(currentUser.effectiveOrganizationId) : null;
  const agreement = await getAgreementSettings(currentUser.effectiveOrganizationId);
  const reviewSettings = await getReviewRequestSettings(currentUser.effectiveOrganizationId);
  const invoiceReminderSettings = await getInvoiceReminderSettings(currentUser.effectiveOrganizationId);
  const jobNotificationSettings = await getJobNotificationSettings(currentUser.effectiveOrganizationId);
  const deliveryReminderSettings = await getDeliveryReminderSettings(currentUser.effectiveOrganizationId);
  const winBackSettings = await getWinBackSettings(currentUser.effectiveOrganizationId);
  const permitAreas = await db.permitArea.findMany({
    where: { organizationId: currentUser.effectiveOrganizationId },
    orderBy: { name: "asc" },
  });
  const emailTemplates = await getAllEmailTemplates(currentUser.effectiveOrganizationId);

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
        <h2 className="text-xl font-semibold text-ink">Booking Page Link</h2>
        <p className="mt-1 text-sm text-zinc-500">
          The public page where customers request a rental online — grab this
          to text a customer, post on social media, or link from your
          website.
        </p>
        <div className="mt-4 flex items-center gap-3">
          <CopyLinkButton
            path="/book"
            label="Copy Booking Page Link"
            className="rounded-xl bg-brand px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-brand-dark"
          />
          <a
            href="/book"
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm font-semibold text-brand hover:underline"
          >
            Open it →
          </a>
        </div>
      </section>

      <section className="mt-6 rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
        <h2 className="text-xl font-semibold text-ink">Staff Accounts</h2>
        <p className="mt-1 text-sm text-zinc-500">
          You (the owner) always have full access. Staff accounts can do the
          day-to-day work — bookings, equipment, customers, mileage — plus
          whatever you check off below for them individually.
        </p>

        <div className="mt-4 flex flex-col gap-4">
          {staffUsers.map((staffUser) => (
            <div
              key={staffUser.id}
              className="rounded-xl border border-zinc-200 p-4"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <span className="font-medium text-zinc-900">{staffUser.name}</span>{" "}
                  <span className="text-sm text-zinc-500">({staffUser.email})</span>
                  <span
                    className={`ml-2 rounded-full px-2 py-0.5 text-xs font-medium capitalize ${
                      staffUser.role === "owner"
                        ? "bg-brand/10 text-brand-dark"
                        : "bg-zinc-100 text-zinc-600"
                    }`}
                  >
                    {staffUser.role}
                  </span>
                  {!staffUser.active && (
                    <span className="ml-2 rounded-full bg-red-50 px-2 py-0.5 text-xs font-medium text-red-700">
                      Deactivated
                    </span>
                  )}
                  {staffUser.isPlatformAdmin && (
                    <span className="ml-2 rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700">
                      Platform Admin
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  <form
                    action={setPlatformAdmin.bind(null, staffUser.id, !staffUser.isPlatformAdmin)}
                  >
                    {staffUser.isPlatformAdmin ? (
                      <ConfirmButton
                        message={`Revoke platform admin access for ${staffUser.name}? They'll no longer be able to view other organizations for support purposes.`}
                        className="text-xs font-semibold text-zinc-500 hover:underline"
                      >
                        Revoke Platform Admin
                      </ConfirmButton>
                    ) : (
                      <ConfirmButton
                        message={`Grant platform admin access to ${staffUser.name}? This lets them view any organization's data for troubleshooting purposes. Only grant this to trusted maintenance/support accounts.`}
                        className="text-xs font-semibold text-zinc-500 hover:underline"
                      >
                        Grant Platform Admin
                      </ConfirmButton>
                    )}
                  </form>
                  {staffUser.role !== "owner" && (
                    <form action={setStaffActive.bind(null, staffUser.id, !staffUser.active)}>
                      {staffUser.active ? (
                        <ConfirmButton
                          message={`Deactivate ${staffUser.name}? They'll be signed out immediately and won't be able to log back in until reactivated.`}
                          className="text-xs font-semibold text-red-600 hover:underline"
                        >
                          Deactivate
                        </ConfirmButton>
                      ) : (
                        <button
                          type="submit"
                          className="text-xs font-semibold text-brand hover:underline"
                        >
                          Reactivate
                        </button>
                      )}
                    </form>
                  )}
                </div>
              </div>

              {staffUser.role !== "owner" && (
                <form
                  action={updateStaffPermissions.bind(null, staffUser.id)}
                  className="mt-3 flex flex-col gap-2 border-t border-zinc-100 pt-3"
                >
                  {PERMISSION_OPTIONS.map((perm) => (
                    <label
                      key={perm.key}
                      className="flex items-center gap-2 text-sm text-zinc-700"
                    >
                      <input
                        type="checkbox"
                        name={perm.key}
                        defaultChecked={staffUser[perm.key]}
                        className="h-4 w-4 rounded border-zinc-300"
                      />
                      {perm.label}
                    </label>
                  ))}
                  <div>
                    <button
                      type="submit"
                      className="mt-1 rounded-lg border border-zinc-300 px-4 py-2 text-xs font-semibold text-zinc-700 transition-colors hover:bg-zinc-50"
                    >
                      Save Permissions
                    </button>
                  </div>
                </form>
              )}
            </div>
          ))}
        </div>

        <form
          action={addStaffUser}
          className="mt-4 flex flex-col gap-4 border-t border-zinc-100 pt-4"
        >
          <p className="text-sm font-medium text-ink">Add a Staff Account</p>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Field label="Name" htmlFor="staffName">
              <input id="staffName" name="name" required className={inputClass} />
            </Field>
            <Field label="Email" htmlFor="staffEmail">
              <input
                id="staffEmail"
                name="email"
                type="email"
                required
                className={inputClass}
              />
            </Field>
            <Field label="Temporary Password" htmlFor="staffPassword">
              <input
                id="staffPassword"
                name="password"
                required
                className={inputClass}
              />
            </Field>
          </div>
          <div>
            <button
              type="submit"
              className="rounded-xl bg-brand px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-brand-dark"
            >
              + Add Staff Account
            </button>
          </div>
        </form>
      </section>

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
        <h2 className="text-xl font-semibold text-ink">Win-Back Campaign</h2>
        <p className="mt-1 text-sm text-zinc-500">
          Controls which customers show up on the Win-Back page (under
          Customers) as lapsed — never sent automatically, always a
          one-click send from that page.
        </p>

        <form action={updateWinBackSettings} className="mt-4 flex flex-col gap-4">
          <Field label="Flag a customer as lapsed after this many days of no activity" htmlFor="lapsedDays">
            <input
              id="lapsedDays"
              name="lapsedDays"
              type="number"
              min="1"
              step="1"
              defaultValue={winBackSettings.lapsedDays}
              className={inputClass}
            />
          </Field>
          <div>
            <button
              type="submit"
              className="rounded-xl bg-brand px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-brand-dark"
            >
              Save
            </button>
          </div>
        </form>
      </section>

      <section className="mt-6 rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
        <h2 className="text-xl font-semibold text-ink">Permit-Required Areas</h2>
        <p className="mt-1 text-sm text-zinc-500">
          Cities or counties where street placement requires a permit. When a
          booking&apos;s delivery address matches one of these, a permit
          checklist automatically shows up on that booking — otherwise it
          stays out of the way.
        </p>

        {permitAreas.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {permitAreas.map((area) => (
              <span
                key={area.id}
                className="flex items-center gap-1.5 rounded-full border border-zinc-200 bg-zinc-50 py-1.5 pl-3 pr-1.5 text-sm text-zinc-700"
              >
                {area.name}
                <form action={removePermitArea.bind(null, area.id)}>
                  <button
                    type="submit"
                    aria-label={`Remove ${area.name}`}
                    className="flex h-5 w-5 items-center justify-center rounded-full text-zinc-400 hover:bg-zinc-200 hover:text-zinc-700"
                  >
                    ×
                  </button>
                </form>
              </span>
            ))}
          </div>
        )}

        <form action={addPermitArea} className="mt-3 flex gap-2">
          <input
            name="name"
            required
            placeholder="e.g. Byron, GA"
            className={`${inputClass} flex-1 py-2.5 text-sm`}
          />
          <button
            type="submit"
            className="flex-shrink-0 rounded-xl border border-zinc-300 px-4 py-2.5 text-sm font-semibold text-zinc-700 transition-colors hover:bg-zinc-50"
          >
            + Add Area
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
