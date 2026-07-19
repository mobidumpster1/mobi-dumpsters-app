import { redirect } from "next/navigation";
import Link from "next/link";
import { getValidConnection, isQuickBooksConfigured, listAccounts, type QboAccount } from "@/lib/quickbooks";
import { isConfigured as isGoogleBusinessConfigured } from "@/lib/googleBusinessProfile";
import { isConfigured as isGoogleAdsConfigured } from "@/lib/googleAds";
import {
  saveAccountMappings,
  disconnectQuickBooks,
  importCustomersFromQuickBooks,
  importExpensesFromQuickBooks,
  updateBranding,
  updatePublicDomain,
  updateAgreementSettings,
  updateReviewRequestSettings,
  sendReviewRequestsNow,
  updateInvoiceReminderSettings,
  sendInvoiceRemindersNow,
  updateJobNotificationSettings,
  updateJobCostingSettings,
  updateAutomationSettings,
  updateDeliveryReminderSettings,
  sendDeliveryRemindersNow,
  saveEmailTemplate,
  resetEmailTemplateToDefault,
  updateWinBackSettings,
  addPermitArea,
  removePermitArea,
  saveWebsiteSnippet,
  deleteWebsiteSnippet,
  saveStripeConnection,
  disconnectStripe,
  disconnectTwilio,
} from "./actions";
import { getStripeConnection } from "@/lib/stripe";
import { getTwilioConnection } from "@/lib/twilio";
import { updateStaffPermissions, setStaffActive } from "./staffActions";
import { AddStaffForm } from "./AddStaffForm";
import { TwilioConnectionForm } from "./TwilioConnectionForm";
import { UpgradeButton, ManageBillingButton } from "./BillingButtons";
import { setPlatformAdmin } from "../platform-admin/actions";
import { getAgreementSettings } from "@/lib/agreement";
import { getReviewRequestSettings } from "@/lib/reviewSettings";
import { getInvoiceReminderSettings } from "@/lib/invoiceReminderSettings";
import { getJobNotificationSettings } from "@/lib/jobNotificationSettings";
import { getJobCostingSettings } from "@/lib/jobCostingSettings";
import { getAutomationSettings } from "@/lib/automationSettings";
import { getDeliveryReminderSettings } from "@/lib/deliveryReminderSettings";
import { getWinBackSettings } from "@/lib/winbackSettings";
import { getAllEmailTemplates } from "@/lib/emailTemplates";
import { getOrgBranding } from "@/lib/orgBranding";
import { Field, inputClass } from "@/components/Field";
import { ImageUploadField } from "@/components/ImageUploadField";
import { serviceAreas } from "@/lib/serviceAreas";
import { EmailTemplateCard } from "@/components/EmailTemplateCard";
import { CopyLinkButton } from "@/components/CopyLinkButton";
import { CopyTextButton } from "@/components/CopyTextButton";
import { WebsiteSnippetManager } from "@/components/WebsiteSnippetManager";
import { ConfirmButton } from "@/components/ConfirmButton";
import { Tabs, type TabItem } from "@/components/Tabs";
import { buildWebsiteWidgets } from "@/lib/websiteWidgets";
import { listBookableCategories } from "@/lib/availability";
import { db } from "@/lib/db";
import { requireUser, hasPlan } from "@/lib/session";
import { headers } from "next/headers";
import { PlanGateNotice } from "@/components/PlanGateNotice";

// Redirect-back confirmation messages (QuickBooks connect, "Send Now"
// buttons) need to land on the tab that actually shows them, not whichever
// tab happens to be first — otherwise the confirmation is invisible until
// you happen to click over to it.
function computeInitialTab(params: {
  qb_connected?: string;
  qb_error?: string;
  gbp_connected?: string;
  gbp_error?: string;
  ads_connected?: string;
  ads_error?: string;
  reviews_sent?: string;
  invoices_sent?: string;
  deliveries_sent?: string;
  billing_success?: string;
  billing_cancelled?: string;
}): string {
  if (
    params.qb_connected !== undefined ||
    params.qb_error !== undefined ||
    params.gbp_connected !== undefined ||
    params.gbp_error !== undefined ||
    params.ads_connected !== undefined ||
    params.ads_error !== undefined
  ) {
    return "integrations";
  }
  if (
    params.reviews_sent !== undefined ||
    params.invoices_sent !== undefined ||
    params.deliveries_sent !== undefined
  ) {
    return "emails";
  }
  if (params.billing_success !== undefined || params.billing_cancelled !== undefined) {
    return "billing";
  }
  return "business";
}

export const dynamic = "force-dynamic";

const PERMISSION_OPTIONS = [
  { key: "canManageInvoices", label: "Manage invoices (create/edit, mark paid, send payment links)" },
  { key: "canDeleteRecords", label: "Delete records (bookings, customers, equipment, invoices, leads)" },
  { key: "canManageExpenses", label: "Manage expenses & recurring bills" },
  { key: "canViewReports", label: "View profit reports" },
  { key: "canManageLeads", label: "Manage Leads & Win-Back outreach" },
  { key: "canManageTime", label: "Edit/delete other staff's time entries" },
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
    gbp_connected?: string;
    gbp_error?: string;
    ads_connected?: string;
    ads_error?: string;
    reviews_sent?: string;
    reviews_checked?: string;
    invoices_sent?: string;
    invoices_checked?: string;
    deliveries_sent?: string;
    deliveries_checked?: string;
    billing_success?: string;
    billing_cancelled?: string;
  }>;
}) {
  const currentUser = await requireUser();
  if (currentUser.role !== "owner") redirect("/");

  const {
    qb_connected,
    qb_error,
    gbp_connected,
    gbp_error,
    ads_connected,
    ads_error,
    reviews_sent,
    reviews_checked,
    invoices_sent,
    invoices_checked,
    deliveries_sent,
    deliveries_checked,
    billing_success,
    billing_cancelled,
  } = await searchParams;
  const configured = isQuickBooksConfigured();
  const googleBusinessConfigured = isGoogleBusinessConfigured();
  const googleBusinessConnection = await db.googleBusinessProfileConnection.findUnique({
    where: { organizationId: currentUser.effectiveOrganizationId },
  });
  const googleAdsConfigured = isGoogleAdsConfigured();
  const googleAdsConnection = await db.googleAdsConnection.findUnique({
    where: { organizationId: currentUser.effectiveOrganizationId },
  });
  const staffUsers = await db.user.findMany({
    where: { organizationId: currentUser.effectiveOrganizationId },
    orderBy: { createdAt: "asc" },
  });
  const connection = configured ? await getValidConnection(currentUser.effectiveOrganizationId) : null;
  const agreement = await getAgreementSettings(currentUser.effectiveOrganizationId);
  const reviewSettings = await getReviewRequestSettings(currentUser.effectiveOrganizationId);
  const invoiceReminderSettings = await getInvoiceReminderSettings(currentUser.effectiveOrganizationId);
  const jobNotificationSettings = await getJobNotificationSettings(currentUser.effectiveOrganizationId);
  const jobCostingSettings = await getJobCostingSettings(currentUser.effectiveOrganizationId);
  const automationSettings = hasPlan(currentUser, "pro")
    ? await getAutomationSettings(currentUser.effectiveOrganizationId)
    : null;
  const deliveryReminderSettings = await getDeliveryReminderSettings(currentUser.effectiveOrganizationId);
  const winBackSettings = await getWinBackSettings(currentUser.effectiveOrganizationId);
  const permitAreas = await db.permitArea.findMany({
    where: { organizationId: currentUser.effectiveOrganizationId },
    orderBy: { name: "asc" },
  });
  const emailTemplates = await getAllEmailTemplates(currentUser.effectiveOrganizationId);
  const orgBranding = await getOrgBranding(currentUser.effectiveOrganizationId);
  const orgDomain = await db.organization.findUnique({
    where: { id: currentUser.effectiveOrganizationId },
    select: { publicDomain: true },
  });
  const bookableCategories = await listBookableCategories(currentUser.effectiveOrganizationId);
  const websiteSnippets = await db.websiteSnippet.findMany({
    where: { organizationId: currentUser.effectiveOrganizationId },
    orderBy: { name: "asc" },
  });
  // Widget links need an absolute, working URL even before a custom domain
  // is set — fall back to whatever host this settings page is being viewed
  // at (same idea as getPublicOrganizationId's fallback).
  const requestHost = (await headers()).get("host") ?? "localhost:3000";
  const widgetBaseUrl = orgDomain?.publicDomain
    ? `https://${orgDomain.publicDomain}`
    : `${requestHost.startsWith("localhost") ? "http" : "https"}://${requestHost}`;
  const websiteWidgets = buildWebsiteWidgets(
    bookableCategories.map((c) => ({ id: c.id, name: c.name })),
    widgetBaseUrl
  );

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
  const stripeConnection = await getStripeConnection(currentUser.effectiveOrganizationId);
  const twilioConnection = await getTwilioConnection(currentUser.effectiveOrganizationId);
  const platformSubscription = await db.platformSubscription.findUnique({
    where: { organizationId: currentUser.effectiveOrganizationId },
  });

  const brandingSection = (
    <section className="rounded-lg border-2 border-zinc-900 bg-white p-5">
      <h2 className="text-xl font-black text-ink">Branding</h2>
      <p className="mt-1 text-sm text-zinc-500">
        Your logo and brand color, shown throughout the app.
      </p>
      <form action={updateBranding} className="mt-4 flex flex-col gap-4">
        <ImageUploadField
          name="logoUrl"
          label="Logo"
          initialUrl={orgBranding.logoUrl}
          folder="branding"
        />
        <Field label="Primary color" htmlFor="primaryColor">
          <div className="flex items-center gap-3">
            <input
              id="primaryColor"
              type="color"
              name="primaryColor"
              defaultValue={orgBranding.primaryColor}
              className="h-12 w-16 cursor-pointer rounded-lg border border-zinc-300 bg-white p-1"
            />
            <span className="font-mono text-sm text-zinc-500">{orgBranding.primaryColor}</span>
          </div>
        </Field>
        <button
          type="submit"
          className="self-start rounded-lg bg-brand px-5 py-3 text-sm font-bold text-white transition-colors hover:bg-brand-dark"
        >
          Save Branding
        </button>
      </form>
    </section>
  );

  const bookingLinkSection = (
    <section className="rounded-lg border-2 border-zinc-900 bg-white p-5">
      <h2 className="text-xl font-black text-ink">Booking Page Link</h2>
      <p className="mt-1 text-sm text-zinc-500">
        The public page where customers request a rental online — grab this
        to text a customer, post on social media, or link from your
        website.
      </p>
      <div className="mt-4 flex items-center gap-3">
        <CopyLinkButton
          path="/book"
          label="Copy Booking Page Link"
          className="rounded-lg bg-brand px-5 py-3 text-sm font-bold text-white transition-colors hover:bg-brand-dark"
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

      <div className="mt-6 border-t border-zinc-100 pt-4">
        <h3 className="text-sm font-semibold text-ink">Custom Domain</h3>
        <p className="mt-1 text-sm text-zinc-500">
          Point your own domain (e.g. book.yourbusiness.com) here instead of
          the default address, so links from your website look like part of
          your site. Add the domain in Vercel&apos;s project settings and a
          matching DNS record with your domain host first, then enter it
          below.
        </p>
        <form
          action={updatePublicDomain}
          className="mt-3 flex flex-wrap items-end gap-3"
        >
          <div className="min-w-0 flex-1">
            <Field label="Domain" htmlFor="publicDomain">
              <input
                id="publicDomain"
                name="publicDomain"
                placeholder="book.yourbusiness.com"
                defaultValue={orgDomain?.publicDomain ?? ""}
                className={inputClass}
              />
            </Field>
          </div>
          <button
            type="submit"
            className="rounded-lg bg-brand px-5 py-3 text-sm font-bold text-white transition-colors hover:bg-brand-dark"
          >
            Save Domain
          </button>
        </form>
      </div>
    </section>
  );

  const jobCostingSection = (
    <section className="rounded-lg border-2 border-zinc-900 bg-white p-5">
      <h2 className="text-xl font-black text-ink">Job Costing</h2>
      <p className="mt-1 text-sm text-zinc-500">
        Flags a job whose margin (revenue minus linked expenses, as a
        percent of revenue) falls below this threshold — shown on each
        booking&apos;s Job Costing tab and the Reports &rarr; Job Profitability table.
      </p>
      <form
        action={updateJobCostingSettings}
        className="mt-3 flex flex-wrap items-end gap-3"
      >
        <div className="w-32">
          <Field label="Alert below (%)" htmlFor="marginAlertPercent">
            <input
              id="marginAlertPercent"
              name="marginAlertPercent"
              type="number"
              min="0"
              max="100"
              defaultValue={jobCostingSettings.marginAlertPercent}
              className={inputClass}
            />
          </Field>
        </div>
        <button
          type="submit"
          className="rounded-lg bg-brand px-5 py-3 text-sm font-bold text-white transition-colors hover:bg-brand-dark"
        >
          Save
        </button>
      </form>
    </section>
  );

  const automationSection = automationSettings && (
    <section className="rounded-lg border-2 border-zinc-900 bg-white p-5">
      <h2 className="text-xl font-black text-ink">Automation Safety Cap</h2>
      <p className="mt-1 text-sm text-zinc-500">
        Hard ceiling on total automated actions (emails, texts, notes) across every rule combined,
        per day — the outermost safety valve on top of each rule&apos;s own per-run/per-day caps.
        Manage the rules themselves on the{" "}
        <Link href="/automation" className="text-brand hover:underline">
          Automation
        </Link>{" "}
        page.
      </p>
      <form action={updateAutomationSettings} className="mt-3 flex flex-wrap items-end gap-3">
        <div className="w-32">
          <Field label="Actions per day" htmlFor="dailyActionCap">
            <input
              id="dailyActionCap"
              name="dailyActionCap"
              type="number"
              min="1"
              defaultValue={automationSettings.dailyActionCap}
              className={inputClass}
            />
          </Field>
        </div>
        <button
          type="submit"
          className="rounded-lg bg-brand px-5 py-3 text-sm font-bold text-white transition-colors hover:bg-brand-dark"
        >
          Save
        </button>
      </form>
    </section>
  );

  const staffSection = (
    <section className="rounded-lg border-2 border-zinc-900 bg-white p-5">
      <h2 className="text-xl font-black text-ink">Staff Accounts</h2>
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
                  className={`ml-2 rounded-full px-2 py-0.5 text-xs font-black capitalize ${
                    staffUser.role === "owner"
                      ? "bg-brand text-white"
                      : "bg-zinc-500 text-white"
                  }`}
                >
                  {staffUser.role}
                </span>
                {!staffUser.active && (
                  <span className="ml-2 rounded-full bg-red-600 px-2 py-0.5 text-xs font-black text-white">
                    Deactivated
                  </span>
                )}
                {staffUser.isPlatformAdmin && (
                  <span className="ml-2 rounded-full bg-amber-500 px-2 py-0.5 text-xs font-black text-white">
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
                <div className="max-w-[200px]">
                  <Field label="Hourly Rate (for Track Time)" htmlFor={`hourlyRate-${staffUser.id}`}>
                    <input
                      id={`hourlyRate-${staffUser.id}`}
                      name="hourlyRate"
                      type="number"
                      step="0.01"
                      min="0"
                      defaultValue={staffUser.hourlyRate ?? ""}
                      className={`${inputClass} py-2 text-sm`}
                    />
                  </Field>
                </div>
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

      <AddStaffForm />
    </section>
  );

  const quickbooksSection = (
    <section className="rounded-lg border-2 border-zinc-900 bg-white p-5">
      <h2 className="text-xl font-black text-ink">QuickBooks Online</h2>

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

      {!hasPlan(currentUser, "team") ? (
        <PlanGateNotice
          requiredPlan="team"
          description="Sync customers, invoices, and expenses straight to your QuickBooks Online account instead of entering them by hand."
        />
      ) : (
        <>
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
                className="mt-3 inline-block rounded-lg bg-brand px-5 py-3 text-sm font-bold text-white transition-colors hover:bg-brand-dark"
              >
                Connect to QuickBooks
              </a>
            </div>
          )}
        </>
      )}

      {hasPlan(currentUser, "team") && configured && connection && (
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
                className="rounded-lg bg-brand px-5 py-3 text-sm font-bold text-white transition-colors hover:bg-brand-dark"
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
            <form action={importExpensesFromQuickBooks}>
              <button
                type="submit"
                className="rounded-xl border border-zinc-300 px-5 py-3 text-sm font-semibold text-zinc-700 transition-colors hover:bg-zinc-50"
              >
                Import Expenses from QuickBooks
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
  );

  const googleBusinessSection = (
    <section className="rounded-lg border-2 border-zinc-900 bg-white p-5">
      <h2 className="text-xl font-black text-ink">Google Business Profile</h2>

      {gbp_connected && (
        <p className="mt-3 rounded-xl bg-green-50 px-4 py-3 text-sm text-green-700">
          Connected to Google Business Profile successfully.
        </p>
      )}
      {gbp_error && (
        <p className="mt-3 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
          Something went wrong connecting ({gbp_error}). Try again.
        </p>
      )}

      {!hasPlan(currentUser, "pro") ? (
        <PlanGateNotice
          requiredPlan="pro"
          description="Sync your Google reviews in automatically and reply to them without leaving the app."
        />
      ) : !googleBusinessConfigured ? (
        <p className="mt-3 text-zinc-500">
          Google Business Profile isn&apos;t set up yet — this needs a Google-approved API
          application, a manual review process on Google&apos;s side. Once approved, add the
          OAuth Client ID, Client Secret, and redirect URL to the app&apos;s environment settings.
        </p>
      ) : !googleBusinessConnection ? (
        <div className="mt-4">
          <p className="text-zinc-500">Not connected yet.</p>
          <a
            href="/api/google-business/connect"
            className="mt-3 inline-block rounded-lg bg-brand px-5 py-3 text-sm font-bold text-white transition-colors hover:bg-brand-dark"
          >
            Connect Google Business Profile
          </a>
        </div>
      ) : (
        <div className="mt-4 flex flex-col gap-2">
          <p className="text-sm text-zinc-500">
            Connected
            {googleBusinessConnection.locationName
              ? ` — syncing reviews for ${googleBusinessConnection.locationName}.`
              : " — pick a location on the Reviews page to finish setup."}
          </p>
          <a href="/reviews" className="text-sm font-semibold text-brand hover:underline">
            Go to Reviews →
          </a>
        </div>
      )}
    </section>
  );

  const googleAdsSection = (
    <section className="rounded-lg border-2 border-zinc-900 bg-white p-5">
      <h2 className="text-xl font-black text-ink">Google Ads (Marketing Intelligence)</h2>
      <p className="mt-1 text-sm text-zinc-500">
        Read-only — pulls campaign performance daily and flags optimization opportunities
        (wasted spend, underperforming ad groups). Never pauses a campaign, changes a bid, or
        moves budget; every finding is a suggestion you act on yourself.
      </p>

      {ads_connected && (
        <p className="mt-3 rounded-xl bg-green-50 px-4 py-3 text-sm text-green-700">
          Connected to Google Ads successfully.
        </p>
      )}
      {ads_error && (
        <p className="mt-3 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
          Something went wrong connecting ({ads_error}). Try again.
        </p>
      )}

      {!hasPlan(currentUser, "pro") ? (
        <PlanGateNotice
          requiredPlan="pro"
          description="Get automatic Google Ads spend analysis and optimization recommendations."
        />
      ) : !googleAdsConfigured ? (
        <p className="mt-3 text-zinc-500">
          Google Ads isn&apos;t set up yet — this needs a Google Ads Developer Token (applied
          for in the Ads UI&apos;s API Center, reviewed by Google — usually a few days for
          read-only/&quot;Basic&quot; access) plus a Google Cloud OAuth Client ID, Client
          Secret, and redirect URL added to the app&apos;s environment settings.
        </p>
      ) : !googleAdsConnection ? (
        <div className="mt-4">
          <p className="text-zinc-500">Not connected yet.</p>
          <a
            href="/api/google-ads/connect"
            className="mt-3 inline-block rounded-lg bg-brand px-5 py-3 text-sm font-bold text-white transition-colors hover:bg-brand-dark"
          >
            Connect Google Ads
          </a>
        </div>
      ) : (
        <div className="mt-4 flex flex-col gap-2">
          <p className="text-sm text-zinc-500">
            Connected to account {googleAdsConnection.customerId} — synced daily.
            {googleAdsConnection.lastSyncedAt
              ? ` Last synced ${googleAdsConnection.lastSyncedAt.toLocaleString()}.`
              : " Waiting on the first sync."}
          </p>
          {googleAdsConnection.lastSyncError && (
            <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
              Last sync failed: {googleAdsConnection.lastSyncError}
            </p>
          )}
        </div>
      )}
    </section>
  );

  const stripeSection = (
    <section className="rounded-lg border-2 border-zinc-900 bg-white p-5">
      <h2 className="text-xl font-black text-ink">Stripe Payments</h2>
      <p className="mt-1 text-sm text-zinc-500">
        Handles all customer-facing payment collection — cards on file,
        charges, and payment links. QuickBooks above stays the accounting
        record; every Stripe payment still shows up there automatically.
      </p>

      {!stripeConnection ? (
        <div className="mt-4">
          <p className="text-zinc-500">Not connected yet.</p>
          <p className="mt-1 text-xs text-zinc-500">
            Create a free account at stripe.com, then paste your API keys
            from the Stripe Dashboard (Developers → API keys) below. Use
            your test keys first to try it out — they start with{" "}
            <code className="rounded bg-zinc-100 px-1 py-0.5">pk_test_</code>{" "}
            and{" "}
            <code className="rounded bg-zinc-100 px-1 py-0.5">sk_test_</code>.
          </p>
          <form action={saveStripeConnection} className="mt-4 flex flex-col gap-4">
            <Field label="Publishable key" htmlFor="publishableKey">
              <input
                id="publishableKey"
                name="publishableKey"
                required
                placeholder="pk_test_..."
                className={inputClass}
              />
            </Field>
            <Field label="Secret key" htmlFor="secretKey">
              <input
                id="secretKey"
                name="secretKey"
                type="password"
                required
                placeholder="sk_test_..."
                className={inputClass}
              />
            </Field>
            <Field label="Webhook signing secret (optional for now)" htmlFor="webhookSecret">
              <input
                id="webhookSecret"
                name="webhookSecret"
                type="password"
                placeholder="whsec_..."
                className={inputClass}
              />
            </Field>
            <p className="-mt-2 text-xs text-zinc-500">
              For the webhook secret: in the Stripe Dashboard, add an
              endpoint pointing to{" "}
              <code className="rounded bg-zinc-100 px-1 py-0.5">
                {widgetBaseUrl}/api/webhooks/stripe
              </code>{" "}
              listening for <code className="rounded bg-zinc-100 px-1 py-0.5">payment_intent.succeeded</code>{" "}
              and <code className="rounded bg-zinc-100 px-1 py-0.5">setup_intent.succeeded</code>, then copy
              its signing secret here.
            </p>
            <div>
              <button
                type="submit"
                className="rounded-lg bg-brand px-5 py-3 text-sm font-bold text-white transition-colors hover:bg-brand-dark"
              >
                Save Stripe Keys
              </button>
            </div>
          </form>
        </div>
      ) : (
        <div className="mt-4 flex flex-col gap-4">
          <p className="text-sm text-zinc-500">
            Connected (
            {stripeConnection.publishableKey.startsWith("pk_live_") ? "live" : "test"} keys).
          </p>
          <form action={saveStripeConnection} className="flex flex-col gap-4 border-t border-zinc-100 pt-4">
            <Field label="Publishable key" htmlFor="publishableKeyUpdate">
              <input
                id="publishableKeyUpdate"
                name="publishableKey"
                required
                defaultValue={stripeConnection.publishableKey}
                className={inputClass}
              />
            </Field>
            <Field label="Secret key" htmlFor="secretKeyUpdate">
              <input
                id="secretKeyUpdate"
                name="secretKey"
                type="password"
                required
                defaultValue={stripeConnection.secretKey}
                className={inputClass}
              />
            </Field>
            <Field label="Webhook signing secret" htmlFor="webhookSecretUpdate">
              <input
                id="webhookSecretUpdate"
                name="webhookSecret"
                type="password"
                defaultValue={stripeConnection.webhookSecret ?? ""}
                placeholder="whsec_..."
                className={inputClass}
              />
            </Field>
            <div>
              <button
                type="submit"
                className="rounded-lg bg-brand px-5 py-3 text-sm font-bold text-white transition-colors hover:bg-brand-dark"
              >
                Update Stripe Keys
              </button>
            </div>
          </form>
          <form action={disconnectStripe} className="border-t border-zinc-100 pt-4">
            <ConfirmButton
              message="Disconnect Stripe? Staff won't be able to charge cards on file or send payment links until you reconnect."
              className="rounded-xl border border-zinc-300 px-5 py-3 text-sm font-semibold text-red-600 transition-colors hover:bg-red-50"
            >
              Disconnect
            </ConfirmButton>
          </form>
        </div>
      )}
    </section>
  );

  const twilioSection = (
    <section className="rounded-lg border-2 border-zinc-900 bg-white p-5">
      <h2 className="text-xl font-black text-ink">Two-Way Texting</h2>
      <p className="mt-1 text-sm text-zinc-500">
        Text customers straight from their profile, and their replies come
        back into the app. Powered by Twilio.
      </p>

      {!twilioConnection ? (
        <div className="mt-4">
          <p className="text-zinc-500">Not connected yet.</p>
          <p className="mt-1 text-xs text-zinc-500">
            Create an account at twilio.com, buy a phone number that can
            send/receive SMS, then paste your Account SID, Auth Token, and
            that phone number below (find the SID and token on your
            Twilio Console dashboard).
          </p>
          <TwilioConnectionForm mode="connect" />
          <p className="-mt-2 text-xs text-zinc-500">
            In the Twilio Console, set this number&apos;s messaging
            webhook (and status callback URL) to{" "}
            <code className="rounded bg-zinc-100 px-1 py-0.5">
              {widgetBaseUrl}/api/webhooks/twilio
            </code>{" "}
            so replies and delivery updates make it back into the app.
          </p>
        </div>
      ) : (
        <div className="mt-4 flex flex-col gap-4">
          <p className="text-sm text-zinc-500">
            Connected — texting from {twilioConnection.phoneNumber}.
          </p>
          <TwilioConnectionForm
            mode="update"
            defaultAccountSid={twilioConnection.accountSid}
            defaultAuthToken={twilioConnection.authToken}
            defaultPhoneNumber={twilioConnection.phoneNumber}
          />
          <form action={disconnectTwilio} className="border-t border-zinc-100 pt-4">
            <ConfirmButton
              message="Disconnect Twilio? Staff won't be able to send or receive texts until you reconnect."
              className="rounded-xl border border-zinc-300 px-5 py-3 text-sm font-semibold text-red-600 transition-colors hover:bg-red-50"
            >
              Disconnect
            </ConfirmButton>
          </form>
        </div>
      )}
    </section>
  );

  const agreementSection = (
    <section className="rounded-lg border-2 border-zinc-900 bg-white p-5">
      <h2 className="text-xl font-black text-ink">Service Agreement</h2>
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
            className="rounded-lg bg-brand px-5 py-3 text-sm font-bold text-white transition-colors hover:bg-brand-dark"
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
  );

  const permitAreasSection = (
    <section className="rounded-lg border-2 border-zinc-900 bg-white p-5">
      <h2 className="text-xl font-black text-ink">Permit-Required Areas</h2>
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
              className="flex items-center gap-1.5 rounded-full border-2 border-zinc-300 bg-white py-1.5 pl-3 pr-1.5 text-sm font-bold text-zinc-700"
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
          className={`${inputClass} flex-1 py-2.5 text-base sm:text-sm`}
        />
        <button
          type="submit"
          className="flex-shrink-0 rounded-xl border border-zinc-300 px-4 py-2.5 text-sm font-semibold text-zinc-700 transition-colors hover:bg-zinc-50"
        >
          + Add Area
        </button>
      </form>
    </section>
  );

  const reviewRequestsSection = (
    <section className="rounded-lg border-2 border-zinc-900 bg-white p-5">
      <h2 className="text-xl font-black text-ink">Review Requests</h2>
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
            className="rounded-lg bg-brand px-5 py-3 text-sm font-bold text-white transition-colors hover:bg-brand-dark"
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
  );

  const invoiceRemindersSection = (
    <section className="rounded-lg border-2 border-zinc-900 bg-white p-5">
      <h2 className="text-xl font-black text-ink">Overdue Invoice Reminders</h2>
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
            className="rounded-lg bg-brand px-5 py-3 text-sm font-bold text-white transition-colors hover:bg-brand-dark"
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
  );

  const winBackSection = (
    <section className="rounded-lg border-2 border-zinc-900 bg-white p-5">
      <h2 className="text-xl font-black text-ink">Win-Back Campaign</h2>
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
            className="rounded-lg bg-brand px-5 py-3 text-sm font-bold text-white transition-colors hover:bg-brand-dark"
          >
            Save
          </button>
        </div>
      </form>
    </section>
  );

  const jobNotificationsSection = (
    <section className="rounded-lg border-2 border-zinc-900 bg-white p-5">
      <h2 className="text-xl font-black text-ink">Job Notifications</h2>
      <p className="mt-1 text-sm text-zinc-500">
        Keep customers posted around a job — when equipment goes out, when
        it comes back, and a heads-up before it&apos;s dropped off.
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
            className="rounded-lg bg-brand px-5 py-3 text-sm font-bold text-white transition-colors hover:bg-brand-dark"
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
              className="rounded-lg bg-brand px-5 py-3 text-sm font-bold text-white transition-colors hover:bg-brand-dark"
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
  );

  const emailTemplatesSection = (
    <section className="rounded-lg border-2 border-zinc-900 bg-white p-5">
      <h2 className="text-xl font-black text-ink">Email Templates</h2>
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
  );

  const seoSection = (
    <section className="rounded-lg border-2 border-zinc-900 bg-white p-5">
      <h2 className="text-xl font-black text-ink">SEO City Pages</h2>
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
  );

  const websiteWidgetsSection = (
    <section className="rounded-lg border-2 border-zinc-900 bg-white p-5">
      <h2 className="text-xl font-black text-ink">Website Widgets & Embeds</h2>
      <p className="mt-1 text-sm text-zinc-500">
        Ready-to-paste code for your own website, built live from your
        current categories and pricing — nothing here goes stale, since
        it&apos;s generated fresh every time you copy it.
      </p>
      {!hasPlan(currentUser, "team") ? (
        <PlanGateNotice
          requiredPlan="team"
          description="Ready-to-paste widgets for your own website, generated live from your categories and pricing, plus a library of saved custom snippets."
        />
      ) : (
        <>
          {!orgDomain?.publicDomain && (
            <p className="mt-3 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-800">
              These currently point to {widgetBaseUrl} — set a custom domain in
              the Business tab first so they point to your own domain instead.
            </p>
          )}

          <div className="mt-4 flex flex-col gap-3">
            {websiteWidgets.map((widget) => (
              <details key={widget.id} className="rounded-xl border border-zinc-200 p-4">
                <summary className="flex cursor-pointer flex-wrap items-center justify-between gap-2 [&::-webkit-details-marker]:hidden">
                  <span>
                    <span className="font-medium text-ink">{widget.title}</span>
                    <span className="mt-0.5 block text-xs text-zinc-500">{widget.description}</span>
                  </span>
                  <span className="flex items-center gap-3">
                    <CopyTextButton
                      text={widget.html}
                      label="Copy Embed Code"
                      className="rounded-lg border border-zinc-300 px-3 py-2 text-xs font-semibold text-zinc-700 transition-colors hover:bg-zinc-50"
                    />
                    <CopyTextButton
                      text={widget.directLink}
                      label="Copy Link"
                      className="text-xs font-semibold text-brand hover:underline"
                    />
                  </span>
                </summary>
                <pre className="mt-3 overflow-x-auto rounded-lg bg-zinc-50 p-3 text-xs text-zinc-700">
                  {widget.html}
                </pre>
              </details>
            ))}
          </div>

          <div className="mt-6 border-t border-zinc-100 pt-4">
            <h3 className="text-sm font-semibold text-ink">Saved Snippets</h3>
            <p className="mt-1 text-sm text-zinc-500">
              Your own custom HTML — a hand-tweaked embed, a promo banner,
              anything you want to save and reuse.
            </p>
            <WebsiteSnippetManager
              snippets={websiteSnippets}
              saveAction={saveWebsiteSnippet}
              deleteAction={deleteWebsiteSnippet}
            />
          </div>
        </>
      )}
    </section>
  );

  const PLAN_LABELS: Record<string, string> = { solo: "Solo", team: "Team", pro: "Pro" };
  const billingSection = (
    <section className="rounded-lg border-2 border-zinc-900 bg-white p-5">
      <h2 className="text-xl font-black text-ink">Plan & Billing</h2>
      <p className="mt-1 text-sm text-zinc-500">
        Your subscription to this app itself — separate from the Stripe
        account above, which is for charging your own customers.
      </p>

      {billing_success !== undefined && (
        <p className="mt-3 rounded-xl bg-green-50 px-4 py-3 text-sm text-green-700">
          Plan updated — thanks!
        </p>
      )}
      {billing_cancelled !== undefined && (
        <p className="mt-3 rounded-xl bg-zinc-50 px-4 py-3 text-sm text-zinc-600">
          Checkout cancelled — you&apos;re still on the {PLAN_LABELS[currentUser.plan]} plan.
        </p>
      )}

      <p className="mt-4 text-sm text-zinc-500">
        Current plan:{" "}
        <span className="font-semibold text-ink">{PLAN_LABELS[currentUser.plan] ?? currentUser.plan}</span>
        {platformSubscription && platformSubscription.status !== "active" && (
          <span className="ml-2 text-amber-600">({platformSubscription.status})</span>
        )}
      </p>

      <div className="mt-4 flex flex-wrap gap-3">
        {currentUser.plan === "solo" && (
          <>
            <UpgradeButton targetPlan="team" label="Upgrade to Team" />
            <UpgradeButton targetPlan="pro" label="Upgrade to Pro" />
          </>
        )}
        {currentUser.plan === "team" && <UpgradeButton targetPlan="pro" label="Upgrade to Pro" />}
        {platformSubscription && <ManageBillingButton />}
      </div>
    </section>
  );

  const tabs: TabItem[] = [
    {
      id: "business",
      label: "Business",
      content: (
        <>
          {brandingSection}
          {bookingLinkSection}
          {jobCostingSection}
          {automationSection}
        </>
      ),
    },
    { id: "team", label: "Team", content: staffSection },
    { id: "billing", label: "Plan & Billing", content: billingSection },
    {
      id: "booking",
      label: "Booking & Agreements",
      content: (
        <>
          {agreementSection}
          {permitAreasSection}
        </>
      ),
    },
    {
      id: "emails",
      label: "Automated Emails",
      content: (
        <>
          {reviewRequestsSection}
          {invoiceRemindersSection}
          {jobNotificationsSection}
          {winBackSection}
          {emailTemplatesSection}
        </>
      ),
    },
    {
      id: "integrations",
      label: "Integrations",
      content: (
        <>
          {stripeSection}
          {twilioSection}
          {quickbooksSection}
          {googleBusinessSection}
          {googleAdsSection}
        </>
      ),
    },
    {
      id: "marketing",
      label: "Marketing",
      content: (
        <>
          {seoSection}
          {websiteWidgetsSection}
        </>
      ),
    },
  ];

  const initialTab = computeInitialTab({
    qb_connected,
    qb_error,
    gbp_connected,
    gbp_error,
    ads_connected,
    ads_error,
    reviews_sent,
    invoices_sent,
    deliveries_sent,
    billing_success,
    billing_cancelled,
  });

  return (
    <div className="max-w-4xl">
      <h1 className="text-3xl font-black tracking-tight text-ink">Settings</h1>
      <div className="mt-6">
        <Tabs tabs={tabs} initialTab={initialTab} />
      </div>
    </div>
  );
}
