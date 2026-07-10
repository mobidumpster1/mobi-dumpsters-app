"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AddressLink } from "@/components/AddressLink";
import { WinBackStatusSelect } from "@/components/WinBackStatusSelect";

type WinBackRow = {
  id: string;
  name: string;
  address: string | null;
  email: string | null;
  daysAgoText: string;
  latestSend: { id: string; status: string; sentAtText: string } | null;
};

type Template = { id: string; name: string };

export function WinBackList({
  rows,
  templates,
  sendBulkAction,
  updateStatusAction,
}: {
  rows: WinBackRow[];
  templates: Template[];
  sendBulkAction: (customerIds: string[], templateId: string) => Promise<{ sent: number; skipped: number }>;
  updateStatusAction: (sendId: string, status: string) => Promise<void>;
}) {
  const router = useRouter();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [templateId, setTemplateId] = useState(templates[0]?.id ?? "");
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  const selectable = rows.filter((r) => r.email);
  const allSelected = selectable.length > 0 && selectable.every((r) => selected.has(r.id));

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAll() {
    setSelected(allSelected ? new Set() : new Set(selectable.map((r) => r.id)));
  }

  async function handleSend() {
    if (selected.size === 0 || !templateId) return;
    setSending(true);
    setResult(null);
    try {
      const { sent, skipped } = await sendBulkAction(Array.from(selected), templateId);
      setResult(
        skipped > 0
          ? `Sent to ${sent}, skipped ${skipped} (no email on file).`
          : `Sent to ${sent}.`
      );
      setSelected(new Set());
      router.refresh();
    } finally {
      setSending(false);
    }
  }

  const bulkBar = (
    <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-center gap-3">
        <label className="flex items-center gap-2 text-sm text-zinc-600">
          <input
            type="checkbox"
            checked={allSelected}
            onChange={toggleAll}
            disabled={selectable.length === 0}
            className="h-4 w-4 rounded border-zinc-300"
          />
          Select all
        </label>
        <span className="text-sm text-zinc-500">{selected.size} selected</span>
        {templates.length === 0 ? (
          <span className="text-xs text-zinc-400">No templates yet — add one below</span>
        ) : (
          <>
            <select
              value={templateId}
              onChange={(e) => setTemplateId(e.target.value)}
              className="rounded-lg border border-zinc-200 bg-zinc-50 px-2 py-1.5 text-xs text-zinc-700 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
            >
              {templates.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={handleSend}
              disabled={selected.size === 0 || sending}
              className="rounded-lg bg-brand px-4 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-brand-dark disabled:opacity-60"
            >
              {sending ? "Sending…" : `Send to Selected (${selected.size})`}
            </button>
          </>
        )}
        {result && <span className="text-xs text-zinc-500">{result}</span>}
      </div>
    </div>
  );

  return (
    <div className="flex flex-col gap-4">
      {bulkBar}

      {/* Mobile: card list */}
      <div className="flex flex-col gap-3 md:hidden">
        {rows.map((row) => (
          <div key={row.id} className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
            <div className="flex items-start gap-3">
              <input
                type="checkbox"
                checked={selected.has(row.id)}
                onChange={() => toggle(row.id)}
                disabled={!row.email}
                className="mt-1 h-4 w-4 rounded border-zinc-300"
              />
              <div className="min-w-0 flex-1">
                <Link href={`/customers/${row.id}`} className="font-medium text-zinc-900 hover:underline">
                  {row.name}
                </Link>
                <dl className="mt-2 flex flex-col gap-1 text-sm">
                  <div className="flex justify-between gap-2">
                    <dt className="text-zinc-500">Last Activity</dt>
                    <dd className="text-zinc-700">{row.daysAgoText}</dd>
                  </div>
                  <div className="flex justify-between gap-2">
                    <dt className="flex-shrink-0 text-zinc-500">Address</dt>
                    <dd className="truncate text-right text-zinc-700">
                      {row.address ? <AddressLink address={row.address} /> : "—"}
                    </dd>
                  </div>
                </dl>
                <div className="mt-2">
                  {!row.email && (
                    <Link
                      href={`/customers/${row.id}/edit`}
                      className="text-xs font-semibold text-brand hover:underline"
                    >
                      Add an email to send outreach
                    </Link>
                  )}
                  {row.latestSend && (
                    <div className="mt-1 flex flex-wrap items-center gap-2">
                      <span className="text-xs text-zinc-400">Sent {row.latestSend.sentAtText}</span>
                      <WinBackStatusSelect
                        sendId={row.latestSend.id}
                        currentStatus={row.latestSend.status}
                        action={updateStatusAction}
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}
        {rows.length === 0 && (
          <p className="rounded-2xl border border-dashed border-zinc-300 p-6 text-center text-zinc-400">
            No lapsed customers right now.
          </p>
        )}
      </div>

      {/* Tablet/desktop: table */}
      <div className="hidden overflow-x-auto rounded-2xl border border-zinc-200 bg-white shadow-sm md:block">
        <table className="w-full text-left text-sm">
          <thead className="bg-zinc-50 text-zinc-500">
            <tr>
              <th className="px-5 py-3.5"></th>
              <th className="px-5 py-3.5 font-semibold">Customer</th>
              <th className="px-5 py-3.5 font-semibold">Address</th>
              <th className="px-5 py-3.5 font-semibold">Last Activity</th>
              <th className="px-5 py-3.5 font-semibold">Outreach</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {rows.map((row) => (
              <tr key={row.id} className="hover:bg-zinc-50">
                <td className="px-5 py-4">
                  <input
                    type="checkbox"
                    checked={selected.has(row.id)}
                    onChange={() => toggle(row.id)}
                    disabled={!row.email}
                    className="h-4 w-4 rounded border-zinc-300"
                  />
                </td>
                <td className="px-5 py-4">
                  <Link href={`/customers/${row.id}`} className="font-medium text-zinc-900 hover:underline">
                    {row.name}
                  </Link>
                </td>
                <td className="px-5 py-4 text-zinc-600">
                  {row.address ? <AddressLink address={row.address} /> : "—"}
                </td>
                <td className="px-5 py-4 text-zinc-600">{row.daysAgoText}</td>
                <td className="min-w-[200px] px-5 py-4">
                  {!row.email && (
                    <Link
                      href={`/customers/${row.id}/edit`}
                      className="text-xs font-semibold text-brand hover:underline"
                    >
                      Add an email to send outreach
                    </Link>
                  )}
                  {row.latestSend && (
                    <div className="flex flex-col gap-1">
                      <span className="text-xs text-zinc-400">Sent {row.latestSend.sentAtText}</span>
                      <WinBackStatusSelect
                        sendId={row.latestSend.id}
                        currentStatus={row.latestSend.status}
                        action={updateStatusAction}
                      />
                    </div>
                  )}
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-zinc-400">
                  No lapsed customers right now.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
