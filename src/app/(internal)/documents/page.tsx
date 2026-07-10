import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { hasPermission, requireUser } from "@/lib/session";
import { Field, inputClass } from "@/components/Field";
import { ConfirmButton } from "@/components/ConfirmButton";
import { formatDate } from "@/lib/date";
import { DOCUMENT_TYPE_LABELS, documentUrgency, utcStartOfToday } from "@/lib/documents";
import { createDocument, deleteDocument } from "./actions";

export const dynamic = "force-dynamic";

export default async function DocumentsPage() {
  const user = await requireUser();
  if (!hasPermission(user, "canViewReports")) redirect("/");

  const [documents, vehicles] = await Promise.all([
    db.document.findMany({ orderBy: { expiresOn: "asc" }, include: { vehicle: true } }),
    db.vehicle.findMany({ where: { active: true }, orderBy: { label: "asc" } }),
  ]);

  const today = utcStartOfToday();

  return (
    <div>
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-ink">Documents</h1>
        <p className="mt-1 text-zinc-500">
          Insurance, registrations, DOT filings, and licenses — with a heads-up on the Dispatch
          page as they get close to expiring.
        </p>
      </div>

      {/* Mobile: card list */}
      <div className="mt-6 flex flex-col gap-3 md:hidden">
        {documents.map((doc) => {
          const u = documentUrgency(doc.expiresOn, today);
          return (
            <div key={doc.id} className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="font-medium text-zinc-900">{doc.name}</div>
                  <div className="text-xs text-zinc-500">{DOCUMENT_TYPE_LABELS[doc.type] ?? doc.type}</div>
                </div>
                <span className={`text-xs ${u.className}`}>{u.text}</span>
              </div>
              <dl className="mt-2 flex flex-col gap-1 text-sm">
                <div className="flex justify-between gap-2">
                  <dt className="text-zinc-500">Expires</dt>
                  <dd className="text-zinc-700">{formatDate(doc.expiresOn)}</dd>
                </div>
                {doc.vehicle && (
                  <div className="flex justify-between gap-2">
                    <dt className="text-zinc-500">Vehicle</dt>
                    <dd className="text-zinc-700">{doc.vehicle.label}</dd>
                  </div>
                )}
                {doc.notes && (
                  <div className="flex justify-between gap-2">
                    <dt className="text-zinc-500">Notes</dt>
                    <dd className="truncate text-right text-zinc-700">{doc.notes}</dd>
                  </div>
                )}
              </dl>
              <div className="mt-2 flex items-center gap-3">
                <a
                  href={doc.fileUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs font-semibold text-brand hover:underline"
                >
                  View File
                </a>
                <form action={deleteDocument.bind(null, doc.id)}>
                  <ConfirmButton
                    message={`Delete "${doc.name}"? This can't be undone.`}
                    className="text-xs font-semibold text-red-600 hover:underline"
                  >
                    Delete
                  </ConfirmButton>
                </form>
              </div>
            </div>
          );
        })}
        {documents.length === 0 && (
          <p className="rounded-2xl border border-dashed border-zinc-300 p-6 text-center text-zinc-400">
            No documents yet.
          </p>
        )}
      </div>

      {/* Tablet/desktop: table */}
      <div className="mt-6 hidden overflow-x-auto rounded-2xl border border-zinc-200 bg-white shadow-sm md:block">
        <table className="w-full text-left text-sm">
          <thead className="bg-zinc-50 text-zinc-500">
            <tr>
              <th className="px-5 py-3.5 font-semibold">Name</th>
              <th className="px-5 py-3.5 font-semibold">Type</th>
              <th className="px-5 py-3.5 font-semibold">Vehicle</th>
              <th className="px-5 py-3.5 font-semibold">Expires</th>
              <th className="px-5 py-3.5 font-semibold"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {documents.map((doc) => {
              const u = documentUrgency(doc.expiresOn, today);
              return (
                <tr key={doc.id} className="hover:bg-zinc-50">
                  <td className="px-5 py-4">
                    <div className="font-medium text-zinc-900">{doc.name}</div>
                    {doc.notes && <div className="text-xs text-zinc-500">{doc.notes}</div>}
                  </td>
                  <td className="px-5 py-4 text-zinc-600">
                    {DOCUMENT_TYPE_LABELS[doc.type] ?? doc.type}
                  </td>
                  <td className="px-5 py-4 text-zinc-600">{doc.vehicle?.label ?? "—"}</td>
                  <td className="px-5 py-4">
                    <div className="text-zinc-700">{formatDate(doc.expiresOn)}</div>
                    <div className={`text-xs ${u.className}`}>{u.text}</div>
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <a
                        href={doc.fileUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs font-semibold text-brand hover:underline"
                      >
                        View File
                      </a>
                      <form action={deleteDocument.bind(null, doc.id)}>
                        <ConfirmButton
                          message={`Delete "${doc.name}"? This can't be undone.`}
                          className="text-xs font-semibold text-red-600 hover:underline"
                        >
                          Delete
                        </ConfirmButton>
                      </form>
                    </div>
                  </td>
                </tr>
              );
            })}
            {documents.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-zinc-400">
                  No documents yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <h2 className="mt-8 text-xl font-semibold text-ink">Add a Document</h2>
      <form
        action={createDocument}
        className="mt-3 flex flex-col gap-4 rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm"
      >
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Type" htmlFor="type">
            <select id="type" name="type" required defaultValue="" className={inputClass}>
              <option value="" disabled>
                Select a type…
              </option>
              {Object.entries(DOCUMENT_TYPE_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Name" htmlFor="name">
            <input
              id="name"
              name="name"
              required
              className={inputClass}
              placeholder="e.g. General Liability Policy"
            />
          </Field>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Expires On" htmlFor="expiresOn">
            <input id="expiresOn" name="expiresOn" type="date" required className={inputClass} />
          </Field>
          <Field label="Vehicle (optional)" htmlFor="vehicleId">
            <select id="vehicleId" name="vehicleId" defaultValue="" className={inputClass}>
              <option value="">Not vehicle-specific</option>
              {vehicles.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.label}
                </option>
              ))}
            </select>
          </Field>
        </div>

        <Field label="Notes (optional)" htmlFor="notes">
          <input id="notes" name="notes" className={inputClass} placeholder="e.g. policy number" />
        </Field>

        <Field label="File" htmlFor="file">
          <input id="file" name="file" type="file" required className={inputClass} />
        </Field>

        <div>
          <button
            type="submit"
            className="rounded-xl bg-brand px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-brand-dark"
          >
            Add Document
          </button>
        </div>
      </form>
    </div>
  );
}
