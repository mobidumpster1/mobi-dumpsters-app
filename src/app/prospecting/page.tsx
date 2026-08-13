import { db } from "@/lib/db";
import { hasPermission, hasPlan, requireUser } from "@/lib/session";
import { PlanGateNotice } from "@/components/PlanGateNotice";
import { AddressLink } from "@/components/AddressLink";
import { ConfirmButton } from "@/components/ConfirmButton";
import { LeadSearchForm } from "@/components/LeadSearchForm";
import { LeadNotesField } from "@/components/LeadNotesField";
import { ProspectContactToggle } from "@/components/ProspectContactToggle";
import { searchProspects } from "./actions";
import { PROSPECT_SOURCE } from "@/lib/prospecting";
import { updateLeadStatus, updateLeadNotes, deleteLead } from "@/app/(internal)/leads/actions";

export const dynamic = "force-dynamic";

// Shares the same monthly free-quota pool as the main Leads search — both
// draw from the same PlacesSearchLog table, so this mirrors that constant
// rather than tracking a separate budget.
const FREE_SEARCHES_PER_MONTH = 1000;

type ContactFilter = "all" | "not_contacted" | "contacted";

export default async function ProspectingPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string }>;
}) {
  const user = await requireUser();
  if (!hasPermission(user, "canManageLeads")) {
    return (
      <div>
        <h1 className="text-2xl font-black tracking-tight text-ink">Company Prospecting</h1>
        <p className="mt-3 text-sm text-zinc-500">
          You don&apos;t have access to this tool. Ask the account owner for access.
        </p>
      </div>
    );
  }
  const canSearch = hasPlan(user, "pro");

  const { filter } = await searchParams;
  const activeFilter: ContactFilter =
    filter === "not_contacted" || filter === "contacted" ? filter : "all";

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const [prospects, searchesUsed] = await Promise.all([
    db.lead.findMany({
      where: {
        organizationId: user.effectiveOrganizationId,
        source: PROSPECT_SOURCE,
        status:
          activeFilter === "contacted"
            ? "contacted"
            : activeFilter === "not_contacted"
              ? "new"
              : undefined,
      },
      orderBy: { createdAt: "desc" },
    }),
    db.placesSearchLog.count({
      where: { createdAt: { gte: monthStart }, organizationId: user.effectiveOrganizationId },
    }),
  ]);

  const searchesLeft = Math.max(0, FREE_SEARCHES_PER_MONTH - searchesUsed);

  return (
    <div>
      <h1 className="text-2xl font-black tracking-tight text-ink">Company Prospecting</h1>
      <p className="mt-1 text-sm text-zinc-500">
        Search Google Maps for businesses to contact, and keep track of who you&apos;ve reached
        out to. A lighter-weight, separate list from your main Leads pipeline.
      </p>

      {canSearch ? (
        <>
          <div
            className={`mt-4 rounded-xl border px-4 py-2 text-xs font-medium ${
              searchesLeft === 0
                ? "border-red-200 bg-red-50 text-red-700"
                : searchesLeft <= 100
                  ? "border-amber-200 bg-amber-50 text-amber-700"
                  : "border-zinc-200 bg-zinc-50 text-zinc-600"
            }`}
          >
            {searchesLeft === 0
              ? "Free searches used up this month (shared with the main Leads search)"
              : `${searchesLeft.toLocaleString()} of ${FREE_SEARCHES_PER_MONTH.toLocaleString()} free searches left this month`}
          </div>

          <div className="mt-4">
            <LeadSearchForm action={searchProspects} areas={[]} />
          </div>
        </>
      ) : (
        <PlanGateNotice
          requiredPlan="pro"
          description="Search Google Maps for companies to contact — right from this page, installable to your home screen."
        />
      )}

      <div className="mt-6 flex flex-wrap gap-2">
        {(
          [
            ["all", "All"],
            ["not_contacted", "Not Contacted"],
            ["contacted", "Contacted"],
          ] as const
        ).map(([value, label]) => (
          <a
            key={value}
            href={value === "all" ? "/prospecting" : `/prospecting?filter=${value}`}
            className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
              activeFilter === value
                ? "bg-brand text-white"
                : "border border-zinc-300 text-zinc-700 hover:bg-zinc-50"
            }`}
          >
            {label}
          </a>
        ))}
      </div>

      <div className="mt-4 flex flex-col gap-3">
        {prospects.map((prospect) => (
          <div key={prospect.id} className="rounded-lg border-2 border-zinc-900 bg-white p-4">
            <div className="flex items-start justify-between gap-2">
              <div>
                <div className="font-medium text-zinc-900">{prospect.name}</div>
                {prospect.category && (
                  <div className="text-xs text-zinc-500">{prospect.category}</div>
                )}
              </div>
              <ProspectContactToggle
                leadId={prospect.id}
                contacted={prospect.status === "contacted"}
                action={updateLeadStatus}
              />
            </div>
            <dl className="mt-2 flex flex-col gap-1 text-sm">
              <div className="flex justify-between gap-2">
                <dt className="text-zinc-500">Phone</dt>
                <dd className="text-zinc-700">
                  {prospect.phone ? (
                    <a
                      href={`tel:${prospect.phone.replace(/[^\d+]/g, "")}`}
                      className="hover:underline"
                    >
                      {prospect.phone}
                    </a>
                  ) : (
                    "—"
                  )}
                </dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt className="flex-shrink-0 text-zinc-500">Address</dt>
                <dd className="truncate text-right text-zinc-700">
                  {prospect.address ? <AddressLink address={prospect.address} /> : "—"}
                </dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt className="text-zinc-500">Website</dt>
                <dd className="truncate text-zinc-700">
                  {prospect.website ? (
                    <a
                      href={prospect.website}
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
            <div className="mt-2">
              <LeadNotesField
                leadId={prospect.id}
                currentNotes={prospect.notes}
                action={updateLeadNotes}
              />
            </div>
            <form action={deleteLead.bind(null, prospect.id)} className="mt-2">
              <ConfirmButton
                message={`Remove ${prospect.name} from this list?`}
                className="text-xs text-red-600 hover:underline"
              >
                Remove
              </ConfirmButton>
            </form>
          </div>
        ))}
        {prospects.length === 0 && (
          <p className="rounded-2xl border border-dashed border-zinc-300 p-6 text-center text-zinc-400">
            {activeFilter === "all"
              ? canSearch
                ? "No companies yet — search above to find some."
                : "No companies saved yet."
              : "Nothing matches this filter."}
          </p>
        )}
      </div>
    </div>
  );
}
