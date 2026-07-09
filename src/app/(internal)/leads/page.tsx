import Link from "next/link";
import { db } from "@/lib/db";
import { AddressLink } from "@/components/AddressLink";
import { ConfirmButton } from "@/components/ConfirmButton";
import { LeadSearchForm } from "@/components/LeadSearchForm";
import { LeadStatusSelect } from "@/components/LeadStatusSelect";
import { LeadNotesField } from "@/components/LeadNotesField";
import { LEAD_STATUS_LABELS } from "@/lib/leadStatus";
import { searchAndSaveLeads, updateLeadStatus, updateLeadNotes, deleteLead } from "./actions";

export const dynamic = "force-dynamic";

const STATUS_FILTERS = ["All", ...Object.keys(LEAD_STATUS_LABELS)] as const;

export default async function LeadsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status } = await searchParams;
  const activeStatus = STATUS_FILTERS.includes(status as (typeof STATUS_FILTERS)[number])
    ? (status as (typeof STATUS_FILTERS)[number])
    : "All";

  const leads = await db.lead.findMany({
    where: activeStatus === "All" ? undefined : { status: activeStatus },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div>
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-ink">Leads</h1>
        <p className="mt-1 text-zinc-500">
          Find local businesses on Google Maps and keep track of outreach.
        </p>
      </div>

      <div className="mt-6">
        <LeadSearchForm action={searchAndSaveLeads} />
      </div>

      <div className="mt-6 flex flex-wrap gap-2">
        {STATUS_FILTERS.map((s) => (
          <Link
            key={s}
            href={s === "All" ? "/leads" : `/leads?status=${s}`}
            className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
              activeStatus === s
                ? "bg-brand text-white"
                : "border border-zinc-300 text-zinc-700 hover:bg-zinc-50"
            }`}
          >
            {s === "All" ? "All Leads" : LEAD_STATUS_LABELS[s]}
          </Link>
        ))}
      </div>

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
              <LeadNotesField
                leadId={lead.id}
                currentNotes={lead.notes}
                action={updateLeadNotes}
              />
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
                  <form action={deleteLead.bind(null, lead.id)}>
                    <ConfirmButton
                      message={`Remove ${lead.name} from your leads?`}
                      className="text-xs text-red-600 hover:underline"
                    >
                      Remove
                    </ConfirmButton>
                  </form>
                </td>
              </tr>
            ))}
            {leads.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-zinc-400">
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
