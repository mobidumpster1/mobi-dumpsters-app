import Link from "next/link";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { hasPermission, requireUser } from "@/lib/session";
import { AddressLink } from "@/components/AddressLink";
import { ConfirmButton } from "@/components/ConfirmButton";
import { LeadSearchForm } from "@/components/LeadSearchForm";
import { LeadStatusSelect } from "@/components/LeadStatusSelect";
import { LeadNotesField } from "@/components/LeadNotesField";
import { LeadEmailField } from "@/components/LeadEmailField";
import { SendTemplatedEmailButton } from "@/components/SendTemplatedEmailButton";
import { EmailTemplateManager } from "@/components/EmailTemplateManager";
import { ServiceAreaManager } from "@/components/ServiceAreaManager";
import { EnrollAllButton } from "@/components/EnrollAllButton";
import { LocationMap } from "@/components/LocationMap";
import { LEAD_STATUS_LABELS } from "@/lib/leadStatus";
import {
  searchAndSaveLeads,
  updateLeadStatus,
  updateLeadNotes,
  updateLeadEmail,
  sendLeadEmail,
  createLeadEmailTemplate,
  deleteLeadEmailTemplate,
  deleteLead,
  convertLeadToCustomer,
  addServiceArea,
  removeServiceArea,
} from "./actions";
import {
  enrollLeadAction,
  enrollAllVisibleAction,
  stopEnrollmentAction,
  sendDueNowAction,
} from "./sequenceActions";

export const dynamic = "force-dynamic";

const STATUS_FILTERS = ["All", ...Object.keys(LEAD_STATUS_LABELS)] as const;

// Google's free tier for the Places Text Search Enterprise SKU (the fields
// this feature needs — phone, website, rating) resets every calendar month.
const FREE_SEARCHES_PER_MONTH = 1000;

function titleCase(text: string) {
  return text.replace(/\b\w/g, (c) => c.toUpperCase());
}

export default async function LeadsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; trade?: string }>;
}) {
  const user = await requireUser();
  if (!hasPermission(user, "canManageLeads")) redirect("/");

  const { status, trade } = await searchParams;
  const activeStatus = STATUS_FILTERS.includes(status as (typeof STATUS_FILTERS)[number])
    ? (status as (typeof STATUS_FILTERS)[number])
    : "All";

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const [leads, searchesUsed, serviceAreas, tradeRows, emailTemplates, sequences, dueFollowUps] =
    await Promise.all([
      db.lead.findMany({
        where: {
          status: activeStatus === "All" ? undefined : activeStatus,
          tradeCategory: trade ? trade : undefined,
        },
        orderBy: { createdAt: "desc" },
        include: {
          sequenceEnrollments: { where: { status: "active" }, include: { sequence: true } },
        },
      }),
      db.placesSearchLog.count({ where: { createdAt: { gte: monthStart } } }),
      db.serviceArea.findMany({ orderBy: { name: "asc" } }),
      db.lead.findMany({
        where: { tradeCategory: { not: null } },
        distinct: ["tradeCategory"],
        select: { tradeCategory: true },
        orderBy: { tradeCategory: "asc" },
      }),
      db.leadEmailTemplate.findMany({ orderBy: { name: "asc" } }),
      db.emailSequence.findMany({ where: { active: true }, orderBy: { name: "asc" } }),
      db.leadSequenceEnrollment.findMany({
        where: {
          status: "active",
          nextDueAt: { lte: new Date() },
          sequence: { autoSend: false, active: true },
        },
        include: { lead: true, sequence: true },
        orderBy: { nextDueAt: "asc" },
      }),
    ]);

  const tradeFilters = tradeRows.map((r) => r.tradeCategory as string);
  const activeTrade = trade && tradeFilters.includes(trade) ? trade : "All";

  const searchesLeft = Math.max(0, FREE_SEARCHES_PER_MONTH - searchesUsed);

  const pins = leads
    .filter((lead) => lead.latitude !== null && lead.longitude !== null)
    .map((lead) => ({
      id: lead.id,
      lat: lead.latitude as number,
      lng: lead.longitude as number,
      label: lead.name,
      href: "/leads",
    }));

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-ink">Leads</h1>
          <p className="mt-1 text-zinc-500">
            Find local businesses on Google Maps and keep track of outreach.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href="/leads/sequences"
            className="rounded-xl border border-zinc-300 px-4 py-2 text-sm font-semibold text-zinc-700 transition-colors hover:bg-zinc-50"
          >
            Manage Sequences
          </Link>
          <div
            className={`rounded-xl border px-4 py-2 text-sm font-medium ${
              searchesLeft === 0
                ? "border-red-200 bg-red-50 text-red-700"
                : searchesLeft <= 100
                  ? "border-amber-200 bg-amber-50 text-amber-700"
                  : "border-zinc-200 bg-zinc-50 text-zinc-600"
            }`}
          >
            {searchesLeft === 0
              ? "Free searches used up this month"
              : `${searchesLeft.toLocaleString()} of ${FREE_SEARCHES_PER_MONTH.toLocaleString()} free searches left this month`}
          </div>
        </div>
      </div>

      {dueFollowUps.length > 0 && (
        <div className="mt-6 rounded-2xl border-2 border-blue-300 bg-blue-50 p-5 shadow-sm">
          <h2 className="text-xl font-semibold text-ink">
            {dueFollowUps.length} Follow-Up{dueFollowUps.length === 1 ? "" : "s"} Due
          </h2>
          <div className="mt-3 flex flex-col gap-2">
            {dueFollowUps.map((enrollment) => (
              <div
                key={enrollment.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-white px-4 py-3 shadow-sm"
              >
                <div>
                  <span className="font-medium text-zinc-900">{enrollment.lead.name}</span>
                  <span className="ml-2 text-sm text-zinc-500">
                    {enrollment.sequence.name} — step {enrollment.currentStep + 1}
                  </span>
                </div>
                <form action={sendDueNowAction.bind(null, enrollment.id)}>
                  <button
                    type="submit"
                    className="rounded-lg bg-brand px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-brand-dark"
                  >
                    Send
                  </button>
                </form>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <ServiceAreaManager
          areas={serviceAreas}
          addAction={addServiceArea}
          removeAction={removeServiceArea}
        />
        <EmailTemplateManager
          templates={emailTemplates}
          placeholderToken="{{businessName}}"
          addAction={createLeadEmailTemplate}
          removeAction={deleteLeadEmailTemplate}
        />
      </div>

      <div className="mt-4">
        <LeadSearchForm action={searchAndSaveLeads} hasAreas={serviceAreas.length > 0} />
      </div>

      {pins.length > 0 && (
        <div className="mt-6">
          <LocationMap pins={pins} />
        </div>
      )}

      {sequences.length > 0 && leads.length > 0 && (
        <div className="mt-6">
          <EnrollAllButton
            leadIds={leads.map((l) => l.id)}
            sequences={sequences}
            action={enrollAllVisibleAction}
          />
        </div>
      )}

      <div className="mt-6 flex flex-wrap gap-2">
        {STATUS_FILTERS.map((s) => {
          const params = new URLSearchParams();
          if (s !== "All") params.set("status", s);
          if (activeTrade !== "All") params.set("trade", activeTrade);
          const qs = params.toString();
          return (
            <Link
              key={s}
              href={qs ? `/leads?${qs}` : "/leads"}
              className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                activeStatus === s
                  ? "bg-brand text-white"
                  : "border border-zinc-300 text-zinc-700 hover:bg-zinc-50"
              }`}
            >
              {s === "All" ? "All Leads" : LEAD_STATUS_LABELS[s]}
            </Link>
          );
        })}
      </div>

      {tradeFilters.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-2">
          {["All", ...tradeFilters].map((t) => {
            const params = new URLSearchParams();
            if (activeStatus !== "All") params.set("status", activeStatus);
            if (t !== "All") params.set("trade", t);
            const qs = params.toString();
            return (
              <Link
                key={t}
                href={qs ? `/leads?${qs}` : "/leads"}
                className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                  activeTrade === t
                    ? "bg-ink text-white"
                    : "border border-zinc-300 text-zinc-700 hover:bg-zinc-50"
                }`}
              >
                {t === "All" ? "All Types" : titleCase(t)}
              </Link>
            );
          })}
        </div>
      )}

      {/* Mobile: card list */}
      <div className="mt-6 flex flex-col gap-3 md:hidden">
        {leads.map((lead) => (
          <div
            key={lead.id}
            className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm"
          >
            <div className="flex items-start justify-between gap-2">
              <div>
                <div className="font-medium text-zinc-900">{lead.name}</div>
                {lead.category && (
                  <div className="text-xs text-zinc-500">{lead.category}</div>
                )}
              </div>
              <LeadStatusSelect
                leadId={lead.id}
                currentStatus={lead.status}
                action={updateLeadStatus}
              />
            </div>
            <dl className="mt-2 flex flex-col gap-1 text-sm">
              <div className="flex justify-between gap-2">
                <dt className="text-zinc-500">Phone</dt>
                <dd className="text-zinc-700">
                  {lead.phone ? (
                    <a href={`tel:${lead.phone.replace(/[^\d+]/g, "")}`} className="hover:underline">
                      {lead.phone}
                    </a>
                  ) : (
                    "—"
                  )}
                </dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt className="flex-shrink-0 text-zinc-500">Address</dt>
                <dd className="truncate text-right text-zinc-700">
                  {lead.address ? <AddressLink address={lead.address} /> : "—"}
                </dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt className="text-zinc-500">Website</dt>
                <dd className="truncate text-zinc-700">
                  {lead.website ? (
                    <a
                      href={lead.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="hover:underline"
                    >
                      Visit
                    </a>
                  ) : (
                    "—"
                  )}
                </dd>
              </div>
            </dl>
            <div className="mt-2 flex items-center gap-2">
              <LeadEmailField leadId={lead.id} currentEmail={lead.email} action={updateLeadEmail} />
              {lead.emailOptOut ? (
                <span className="flex-shrink-0 text-xs font-medium text-zinc-400">Unsubscribed</span>
              ) : (
                <SendTemplatedEmailButton id={lead.id} templates={emailTemplates} action={sendLeadEmail} />
              )}
            </div>
            {lead.sequenceEnrollments.length > 0 ? (
              <div className="mt-1 flex items-center justify-between gap-2 text-xs text-zinc-500">
                <span>
                  In {lead.sequenceEnrollments[0].sequence.name} — step{" "}
                  {lead.sequenceEnrollments[0].currentStep + 1}
                </span>
                <form action={stopEnrollmentAction.bind(null, lead.sequenceEnrollments[0].id)}>
                  <button type="submit" className="font-semibold text-red-600 hover:underline">
                    Stop
                  </button>
                </form>
              </div>
            ) : (
              !lead.emailOptOut &&
              sequences.length > 0 && (
                <div className="mt-1">
                  <SendTemplatedEmailButton
                    id={lead.id}
                    templates={sequences}
                    action={enrollLeadAction}
                    idleLabel="Enroll"
                    busyLabel="Enrolling…"
                    errorFallback="Couldn't enroll this lead"
                  />
                </div>
              )
            )}
            {lead.lastEmailSentAt && (
              <p className="mt-1 text-xs text-zinc-400">
                Last emailed {lead.lastEmailSentAt.toLocaleDateString()}
              </p>
            )}
            <div className="mt-2 flex items-center gap-2">
              <LeadNotesField
                leadId={lead.id}
                currentNotes={lead.notes}
                action={updateLeadNotes}
              />
              {lead.status === "customer" ? (
                <span className="flex-shrink-0 text-xs font-medium text-green-700">✓ Customer</span>
              ) : (
                <form action={convertLeadToCustomer.bind(null, lead.id)}>
                  <button
                    type="submit"
                    className="flex-shrink-0 text-xs font-semibold text-brand hover:underline"
                  >
                    Convert
                  </button>
                </form>
              )}
              <form action={deleteLead.bind(null, lead.id)}>
                <ConfirmButton
                  message={`Remove ${lead.name} from your leads?`}
                  className="flex-shrink-0 text-xs text-red-600 hover:underline"
                >
                  Remove
                </ConfirmButton>
              </form>
            </div>
          </div>
        ))}
        {leads.length === 0 && (
          <p className="rounded-2xl border border-dashed border-zinc-300 p-6 text-center text-zinc-400">
            {activeStatus === "All"
              ? "No leads yet — search above to find local businesses."
              : "No leads with this status."}
          </p>
        )}
      </div>

      {/* Tablet/desktop: table */}
      <div className="mt-6 hidden overflow-x-auto rounded-2xl border border-zinc-200 bg-white shadow-sm md:block">
        <table className="w-full text-left text-sm">
          <thead className="bg-zinc-50 text-zinc-500">
            <tr>
              <th className="px-5 py-3.5 font-semibold">Business</th>
              <th className="px-5 py-3.5 font-semibold">Phone</th>
              <th className="px-5 py-3.5 font-semibold">Address</th>
              <th className="px-5 py-3.5 font-semibold">Website</th>
              <th className="px-5 py-3.5 font-semibold">Email</th>
              <th className="px-5 py-3.5 font-semibold">Sequence</th>
              <th className="px-5 py-3.5 font-semibold">Notes</th>
              <th className="px-5 py-3.5 font-semibold">Status</th>
              <th className="px-5 py-3.5 font-semibold"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {leads.map((lead) => (
              <tr key={lead.id} className="hover:bg-zinc-50">
                <td className="px-5 py-4">
                  <div className="font-medium text-zinc-900">{lead.name}</div>
                  {lead.category && (
                    <div className="text-xs text-zinc-500">{lead.category}</div>
                  )}
                </td>
                <td className="px-5 py-4 text-zinc-600">
                  {lead.phone ? (
                    <a href={`tel:${lead.phone.replace(/[^\d+]/g, "")}`} className="hover:underline">
                      {lead.phone}
                    </a>
                  ) : (
                    "—"
                  )}
                </td>
                <td className="px-5 py-4 text-zinc-600">
                  {lead.address ? <AddressLink address={lead.address} /> : "—"}
                </td>
                <td className="px-5 py-4 text-zinc-600">
                  {lead.website ? (
                    <a
                      href={lead.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="hover:underline"
                    >
                      Visit
                    </a>
                  ) : (
                    "—"
                  )}
                </td>
                <td className="min-w-[180px] px-5 py-4">
                  <LeadEmailField leadId={lead.id} currentEmail={lead.email} action={updateLeadEmail} />
                  <div className="mt-1">
                    {lead.emailOptOut ? (
                      <span className="text-xs font-medium text-zinc-400">Unsubscribed</span>
                    ) : (
                      <SendTemplatedEmailButton id={lead.id} templates={emailTemplates} action={sendLeadEmail} />
                    )}
                  </div>
                  {lead.lastEmailSentAt && (
                    <p className="mt-1 text-xs text-zinc-400">
                      Sent {lead.lastEmailSentAt.toLocaleDateString()}
                    </p>
                  )}
                </td>
                <td className="min-w-[160px] px-5 py-4">
                  {lead.sequenceEnrollments.length > 0 ? (
                    <div className="flex flex-col gap-1">
                      <span className="text-xs text-zinc-600">
                        {lead.sequenceEnrollments[0].sequence.name} — step{" "}
                        {lead.sequenceEnrollments[0].currentStep + 1}
                      </span>
                      <form action={stopEnrollmentAction.bind(null, lead.sequenceEnrollments[0].id)}>
                        <button type="submit" className="text-xs font-semibold text-red-600 hover:underline">
                          Stop
                        </button>
                      </form>
                    </div>
                  ) : (
                    !lead.emailOptOut &&
                    sequences.length > 0 && (
                      <SendTemplatedEmailButton
                        id={lead.id}
                        templates={sequences}
                        action={enrollLeadAction}
                        idleLabel="Enroll"
                        busyLabel="Enrolling…"
                        errorFallback="Couldn't enroll this lead"
                      />
                    )
                  )}
                </td>
                <td className="px-5 py-4">
                  <LeadNotesField
                    leadId={lead.id}
                    currentNotes={lead.notes}
                    action={updateLeadNotes}
                  />
                </td>
                <td className="px-5 py-4">
                  <LeadStatusSelect
                    leadId={lead.id}
                    currentStatus={lead.status}
                    action={updateLeadStatus}
                  />
                </td>
                <td className="px-5 py-4">
                  <div className="flex items-center gap-3">
                    {lead.status === "customer" ? (
                      <span className="text-xs font-medium text-green-700">✓ Customer</span>
                    ) : (
                      <form action={convertLeadToCustomer.bind(null, lead.id)}>
                        <button
                          type="submit"
                          className="text-xs font-semibold text-brand hover:underline"
                        >
                          Convert
                        </button>
                      </form>
                    )}
                    <form action={deleteLead.bind(null, lead.id)}>
                      <ConfirmButton
                        message={`Remove ${lead.name} from your leads?`}
                        className="text-xs text-red-600 hover:underline"
                      >
                        Remove
                      </ConfirmButton>
                    </form>
                  </div>
                </td>
              </tr>
            ))}
            {leads.length === 0 && (
              <tr>
                <td colSpan={9} className="px-4 py-8 text-center text-zinc-400">
                  {activeStatus === "All"
                    ? "No leads yet — search above to find local businesses."
                    : "No leads with this status."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
