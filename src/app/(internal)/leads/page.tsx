import Link from "next/link";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { hasPermission, requireUser } from "@/lib/session";
import { AddressLink } from "@/components/AddressLink";
import { ConfirmButton } from "@/components/ConfirmButton";
import { LeadSearchForm } from "@/components/LeadSearchForm";
import { LeadStatusSelect } from "@/components/LeadStatusSelect";
import { LeadNotesField } from "@/components/LeadNotesField";
import { LeadTagsField } from "@/components/LeadTagsField";
import { LeadEmailField } from "@/components/LeadEmailField";
import { SendTemplatedEmailButton } from "@/components/SendTemplatedEmailButton";
import { EmailTemplateManager } from "@/components/EmailTemplateManager";
import { ServiceAreaManager } from "@/components/ServiceAreaManager";
import { EnrollAllButton } from "@/components/EnrollAllButton";
import { EnrichAllButton } from "@/components/EnrichAllButton";
import { LocationMap } from "@/components/LocationMap";
import { LEAD_STATUS_LABELS } from "@/lib/leadStatus";
import {
  searchAndSaveLeads,
  updateLeadStatus,
  updateLeadNotes,
  updateLeadTags,
  updateLeadServiceRadius,
  updateLeadEmail,
  sendLeadEmail,
  createLeadEmailTemplate,
  deleteLeadEmailTemplate,
  deleteLead,
  convertLeadToCustomer,
  addServiceArea,
  removeServiceArea,
  enrichLead,
  enrichAllLeads,
} from "./actions";
import { getLeadOutreachSettings } from "@/lib/leadOutreachSettings";
import { milesBetween } from "@/lib/distance";
import { parseTags } from "@/lib/tags";
import { branding } from "@/lib/branding";
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

type SocialLead = {
  facebookUrl: string | null;
  instagramUrl: string | null;
  linkedinUrl: string | null;
};

function SocialLinksRow({ lead }: { lead: SocialLead }) {
  if (!lead.facebookUrl && !lead.instagramUrl && !lead.linkedinUrl) return null;
  return (
    <div className="mt-1 flex flex-wrap gap-2 text-xs">
      {lead.facebookUrl && (
        <a
          href={lead.facebookUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="font-semibold text-blue-700 hover:underline"
        >
          Facebook
        </a>
      )}
      {lead.instagramUrl && (
        <a
          href={lead.instagramUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="font-semibold text-pink-700 hover:underline"
        >
          Instagram
        </a>
      )}
      {lead.linkedinUrl && (
        <a
          href={lead.linkedinUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="font-semibold text-sky-700 hover:underline"
        >
          LinkedIn
        </a>
      )}
    </div>
  );
}

function DistanceBadge({ miles, radiusMiles }: { miles: number; radiusMiles: number }) {
  const outside = miles > radiusMiles;
  return (
    <span
      className={`text-xs font-medium ${outside ? "text-red-600" : "text-zinc-400"}`}
      title={outside ? `Outside your ${radiusMiles}-mile service area` : undefined}
    >
      {Math.round(miles)} mi{outside ? " — outside service area" : ""}
    </span>
  );
}

export default async function LeadsPage({
  searchParams,
}: {
  searchParams: Promise<{
    status?: string;
    trade?: string;
    sort?: string;
    hideOutOfArea?: string;
  }>;
}) {
  const user = await requireUser();
  if (!hasPermission(user, "canManageLeads")) redirect("/");

  const { status, trade, sort, hideOutOfArea } = await searchParams;
  const activeStatus = STATUS_FILTERS.includes(status as (typeof STATUS_FILTERS)[number])
    ? (status as (typeof STATUS_FILTERS)[number])
    : "All";
  const sortByDistance = sort === "distance";
  const hidingOutOfArea = hideOutOfArea === "1";

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const [
    leads,
    searchesUsed,
    serviceAreas,
    tradeRows,
    emailTemplates,
    sequences,
    dueFollowUps,
    leadOutreachSettings,
  ] = await Promise.all([
      db.lead.findMany({
        where: {
          organizationId: user.effectiveOrganizationId,
          status: activeStatus === "All" ? undefined : activeStatus,
          tradeCategory: trade ? trade : undefined,
        },
        orderBy: { createdAt: "desc" },
        include: {
          sequenceEnrollments: { where: { status: "active" }, include: { sequence: true } },
          _count: { select: { emailSends: true } },
        },
      }),
      db.placesSearchLog.count({
        where: { createdAt: { gte: monthStart }, organizationId: user.effectiveOrganizationId },
      }),
      db.serviceArea.findMany({
        where: { organizationId: user.effectiveOrganizationId },
        orderBy: { name: "asc" },
      }),
      db.lead.findMany({
        where: { tradeCategory: { not: null }, organizationId: user.effectiveOrganizationId },
        distinct: ["tradeCategory"],
        select: { tradeCategory: true },
        orderBy: { tradeCategory: "asc" },
      }),
      db.leadEmailTemplate.findMany({
        where: { organizationId: user.effectiveOrganizationId },
        orderBy: { name: "asc" },
      }),
      db.emailSequence.findMany({
        where: { active: true, organizationId: user.effectiveOrganizationId },
        orderBy: { name: "asc" },
      }),
      db.leadSequenceEnrollment.findMany({
        where: {
          status: "active",
          nextDueAt: { lte: new Date() },
          sequence: { autoSend: false, active: true, organizationId: user.effectiveOrganizationId },
        },
        include: { lead: true, sequence: true },
        orderBy: { nextDueAt: "asc" },
      }),
      getLeadOutreachSettings(user.effectiveOrganizationId),
    ]);

  const tradeFilters = tradeRows.map((r) => r.tradeCategory as string);
  const activeTrade = trade && tradeFilters.includes(trade) ? trade : "All";

  const searchesLeft = Math.max(0, FREE_SEARCHES_PER_MONTH - searchesUsed);

  // Tag suggestions offered in the picker: every tag already used on any
  // lead, plus the org's configured service areas (so a location tag is a
  // one-click add instead of retyping a city name every time).
  const usedTags = new Set<string>();
  for (const lead of leads) {
    for (const tag of parseTags(lead.tags)) usedTags.add(tag);
  }
  // Tags are stored comma-separated, so a suggestion containing its own
  // comma (service areas are named e.g. "Byron, GA") would get split into
  // two tags the moment it's saved — strip the state suffix here.
  for (const area of serviceAreas) usedTags.add(area.name.replace(/,\s*[A-Z]{2}$/, ""));
  const tagSuggestions = Array.from(usedTags).sort();

  const distanceByLeadId = new Map<string, number>();
  for (const lead of leads) {
    if (lead.latitude === null || lead.longitude === null) continue;
    distanceByLeadId.set(
      lead.id,
      milesBetween(branding.yardLatitude, branding.yardLongitude, lead.latitude, lead.longitude)
    );
  }

  // Applied in-memory (not in the DB query) since distance is computed
  // from lat/lng rather than stored — the lead list is small enough per
  // organization that this is simpler than a raw geo query.
  let visibleLeads = hidingOutOfArea
    ? leads.filter((lead) => {
        const miles = distanceByLeadId.get(lead.id);
        return miles === undefined || miles <= leadOutreachSettings.serviceRadiusMiles;
      })
    : leads;

  if (sortByDistance) {
    visibleLeads = [...visibleLeads].sort((a, b) => {
      const da = distanceByLeadId.get(a.id);
      const db_ = distanceByLeadId.get(b.id);
      if (da === undefined && db_ === undefined) return 0;
      if (da === undefined) return 1; // no address on file — push to the end
      if (db_ === undefined) return -1;
      return da - db_;
    });
  }

  const pins = visibleLeads
    .filter((lead) => lead.latitude !== null && lead.longitude !== null)
    .map((lead) => ({
      id: lead.id,
      lat: lead.latitude as number,
      lng: lead.longitude as number,
      label: lead.name,
      href: "/leads",
    }));

  const pendingEnrichCount = visibleLeads.filter((l) => l.website && !l.enrichedAt).length;

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-ink">Leads</h1>
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
        <div className="mt-6 rounded-lg border-2 border-blue-600 bg-blue-50 p-5">
          <h2 className="text-xl font-black text-ink">
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

      <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
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

      <form
        action={updateLeadServiceRadius}
        className="mt-4 flex flex-wrap items-center gap-3 rounded-xl border border-zinc-200 bg-white p-4"
      >
        <label htmlFor="serviceRadiusMiles" className="text-sm font-medium text-zinc-700">
          Flag leads farther than
        </label>
        <input
          id="serviceRadiusMiles"
          name="serviceRadiusMiles"
          type="number"
          min="1"
          defaultValue={leadOutreachSettings.serviceRadiusMiles}
          className="w-20 rounded-lg border border-zinc-300 px-2 py-1.5 text-base text-zinc-700 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20 sm:text-sm"
        />
        <span className="text-sm font-medium text-zinc-700">miles from the yard</span>
        <button
          type="submit"
          className="rounded-lg border border-zinc-300 px-3 py-1.5 text-xs font-semibold text-zinc-700 transition-colors hover:bg-zinc-50"
        >
          Save
        </button>
      </form>

      <div className="mt-4">
        <LeadSearchForm action={searchAndSaveLeads} areas={serviceAreas} />
      </div>

      {pins.length > 0 && (
        <div className="mt-6">
          <LocationMap pins={pins} />
        </div>
      )}

      {pendingEnrichCount > 0 && (
        <div className="mt-6">
          <EnrichAllButton pendingCount={pendingEnrichCount} action={enrichAllLeads} />
        </div>
      )}

      {sequences.length > 0 && visibleLeads.length > 0 && (
        <div className="mt-6">
          <EnrollAllButton
            leadIds={visibleLeads.map((l) => l.id)}
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
          if (sortByDistance) params.set("sort", "distance");
          if (hidingOutOfArea) params.set("hideOutOfArea", "1");
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
            if (sortByDistance) params.set("sort", "distance");
            if (hidingOutOfArea) params.set("hideOutOfArea", "1");
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

      <div className="mt-2 flex flex-wrap gap-2">
        {(() => {
          const sortParams = new URLSearchParams();
          if (activeStatus !== "All") sortParams.set("status", activeStatus);
          if (activeTrade !== "All") sortParams.set("trade", activeTrade);
          if (!sortByDistance) sortParams.set("sort", "distance");
          if (hidingOutOfArea) sortParams.set("hideOutOfArea", "1");
          const sortQs = sortParams.toString();

          const hideParams = new URLSearchParams();
          if (activeStatus !== "All") hideParams.set("status", activeStatus);
          if (activeTrade !== "All") hideParams.set("trade", activeTrade);
          if (sortByDistance) hideParams.set("sort", "distance");
          if (!hidingOutOfArea) hideParams.set("hideOutOfArea", "1");
          const hideQs = hideParams.toString();

          return (
            <>
              <Link
                href={sortQs ? `/leads?${sortQs}` : "/leads"}
                className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                  sortByDistance
                    ? "bg-brand text-white"
                    : "border border-zinc-300 text-zinc-700 hover:bg-zinc-50"
                }`}
              >
                {sortByDistance ? "✓ Sorted by Distance" : "Sort by Distance"}
              </Link>
              <Link
                href={hideQs ? `/leads?${hideQs}` : "/leads"}
                className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                  hidingOutOfArea
                    ? "bg-brand text-white"
                    : "border border-zinc-300 text-zinc-700 hover:bg-zinc-50"
                }`}
              >
                {hidingOutOfArea
                  ? `✓ Hiding Leads Over ${leadOutreachSettings.serviceRadiusMiles} mi`
                  : `Hide Leads Over ${leadOutreachSettings.serviceRadiusMiles} mi`}
              </Link>
            </>
          );
        })()}
      </div>

      {/* Mobile: card list */}
      <div className="mt-6 flex flex-col gap-3 md:hidden">
        {visibleLeads.map((lead) => (
          <div
            key={lead.id}
            className="rounded-lg border-2 border-zinc-900 bg-white p-4"
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
              {distanceByLeadId.has(lead.id) && (
                <div className="flex justify-end">
                  <DistanceBadge
                    miles={distanceByLeadId.get(lead.id) as number}
                    radiusMiles={leadOutreachSettings.serviceRadiusMiles}
                  />
                </div>
              )}
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
            <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-center">
              <LeadEmailField leadId={lead.id} currentEmail={lead.email} action={updateLeadEmail} />
              {lead.emailOptOut ? (
                <span className="flex-shrink-0 text-xs font-medium text-zinc-400">Unsubscribed</span>
              ) : (
                <SendTemplatedEmailButton id={lead.id} templates={emailTemplates} action={sendLeadEmail} />
              )}
            </div>
            <SocialLinksRow lead={lead} />
            {lead.website && (
              <form action={enrichLead.bind(null, lead.id)} className="mt-1">
                <button type="submit" className="text-xs font-semibold text-brand hover:underline">
                  {lead.enrichedAt ? "Re-scrape Website" : "Find Contact Info"}
                </button>
              </form>
            )}
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
                Last emailed {lead.lastEmailSentAt.toLocaleDateString()} · {lead._count.emailSends}{" "}
                email{lead._count.emailSends === 1 ? "" : "s"} sent
              </p>
            )}
            <div className="mt-2">
              <LeadTagsField
                leadId={lead.id}
                currentTags={lead.tags}
                suggestions={tagSuggestions}
                action={updateLeadTags}
              />
            </div>
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
        {visibleLeads.length === 0 && (
          <p className="rounded-2xl border border-dashed border-zinc-300 p-6 text-center text-zinc-400">
            {activeStatus === "All"
              ? "No leads yet — search above to find local businesses."
              : "No leads with this status."}
          </p>
        )}
      </div>

      {/* Tablet/desktop: table */}
      <div className="mt-6 hidden overflow-x-auto rounded-lg border-2 border-zinc-900 bg-white md:block">
        <table className="w-full text-left text-sm">
          <thead className="bg-zinc-50 text-zinc-500">
            <tr>
              <th className="px-5 py-3.5 font-semibold">Business</th>
              <th className="px-5 py-3.5 font-semibold">Phone</th>
              <th className="px-5 py-3.5 font-semibold">Address</th>
              <th className="px-5 py-3.5 font-semibold">Website</th>
              <th className="px-5 py-3.5 font-semibold">Email</th>
              <th className="px-5 py-3.5 font-semibold">Tags</th>
              <th className="px-5 py-3.5 font-semibold">Sequence</th>
              <th className="px-5 py-3.5 font-semibold">Notes</th>
              <th className="px-5 py-3.5 font-semibold">Status</th>
              <th className="px-5 py-3.5 font-semibold"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {visibleLeads.map((lead) => (
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
                  {distanceByLeadId.has(lead.id) && (
                    <div className="mt-0.5">
                      <DistanceBadge
                        miles={distanceByLeadId.get(lead.id) as number}
                        radiusMiles={leadOutreachSettings.serviceRadiusMiles}
                      />
                    </div>
                  )}
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
                      Sent {lead.lastEmailSentAt.toLocaleDateString()} · {lead._count.emailSends}{" "}
                      total
                    </p>
                  )}
                  <SocialLinksRow lead={lead} />
                  {lead.website && (
                    <form action={enrichLead.bind(null, lead.id)} className="mt-1">
                      <button type="submit" className="text-xs font-semibold text-brand hover:underline">
                        {lead.enrichedAt ? "Re-scrape Website" : "Find Contact Info"}
                      </button>
                    </form>
                  )}
                </td>
                <td className="min-w-[160px] px-5 py-4">
                  <LeadTagsField
                    leadId={lead.id}
                    currentTags={lead.tags}
                    suggestions={tagSuggestions}
                    action={updateLeadTags}
                  />
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
            {visibleLeads.length === 0 && (
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
