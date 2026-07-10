import Link from "next/link";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { hasPermission, requireUser } from "@/lib/session";
import { AddressLink } from "@/components/AddressLink";
import { CustomerTabs } from "@/components/CustomerTabs";
import { EmailTemplateManager } from "@/components/EmailTemplateManager";
import { SendTemplatedEmailButton } from "@/components/SendTemplatedEmailButton";
import { getWinBackSettings } from "@/lib/winbackSettings";
import {
  sendWinBackEmail,
  createWinBackEmailTemplate,
  deleteWinBackEmailTemplate,
} from "../winbackActions";

export const dynamic = "force-dynamic";

function daysAgo(date: Date) {
  return Math.floor((Date.now() - date.getTime()) / (1000 * 60 * 60 * 24));
}

export default async function WinBackPage() {
  const user = await requireUser();
  if (!hasPermission(user, "canManageLeads")) redirect("/");

  const [settings, customers, templates] = await Promise.all([
    getWinBackSettings(),
    db.customer.findMany({
      include: {
        bookings: { include: { items: { select: { startDate: true } } } },
        invoices: { select: { issueDate: true } },
      },
    }),
    db.winBackEmailTemplate.findMany({ orderBy: { name: "asc" } }),
  ]);

  const cutoff = new Date(Date.now() - settings.lapsedDays * 24 * 60 * 60 * 1000);

  const lapsed = customers
    .map((customer) => {
      const dates = [
        ...customer.bookings.flatMap((b) => b.items.map((i) => i.startDate)),
        ...customer.invoices.map((i) => i.issueDate),
      ];
      if (dates.length === 0) return null;
      const lastActivity = new Date(Math.max(...dates.map((d) => d.getTime())));
      if (lastActivity >= cutoff) return null;
      return { customer, lastActivity };
    })
    .filter((row): row is { customer: (typeof customers)[number]; lastActivity: Date } => row !== null)
    .sort((a, b) => a.lastActivity.getTime() - b.lastActivity.getTime());

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-ink">Win-Back</h1>
          <p className="mt-1 text-zinc-500">
            Customers with no activity in the last {settings.lapsedDays} days. Adjust this
            threshold in{" "}
            <Link href="/settings" className="text-brand hover:underline">
              Settings
            </Link>
            .
          </p>
        </div>
      </div>

      <div className="mt-6">
        <CustomerTabs showWinBack />
      </div>

      <div className="mt-6">
        <EmailTemplateManager
          templates={templates}
          placeholderToken="{{customerName}}"
          addAction={createWinBackEmailTemplate}
          removeAction={deleteWinBackEmailTemplate}
        />
      </div>

      {/* Mobile: card list */}
      <div className="mt-6 flex flex-col gap-3 md:hidden">
        {lapsed.map(({ customer, lastActivity }) => (
          <div
            key={customer.id}
            className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm"
          >
            <Link
              href={`/customers/${customer.id}`}
              className="font-medium text-zinc-900 hover:underline"
            >
              {customer.name}
            </Link>
            <dl className="mt-2 flex flex-col gap-1 text-sm">
              <div className="flex justify-between gap-2">
                <dt className="text-zinc-500">Last Activity</dt>
                <dd className="text-zinc-700">{daysAgo(lastActivity)} days ago</dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt className="flex-shrink-0 text-zinc-500">Address</dt>
                <dd className="truncate text-right text-zinc-700">
                  {customer.address ? <AddressLink address={customer.address} /> : "—"}
                </dd>
              </div>
            </dl>
            <div className="mt-2">
              {customer.email ? (
                <SendTemplatedEmailButton
                  id={customer.id}
                  templates={templates}
                  action={sendWinBackEmail}
                />
              ) : (
                <Link
                  href={`/customers/${customer.id}/edit`}
                  className="text-xs font-semibold text-brand hover:underline"
                >
                  Add an email to send outreach
                </Link>
              )}
              {customer.lastWinBackEmailSentAt && (
                <p className="mt-1 text-xs text-zinc-400">
                  Last emailed {customer.lastWinBackEmailSentAt.toLocaleDateString()}
                </p>
              )}
            </div>
          </div>
        ))}
        {lapsed.length === 0 && (
          <p className="rounded-2xl border border-dashed border-zinc-300 p-6 text-center text-zinc-400">
            No lapsed customers right now.
          </p>
        )}
      </div>

      {/* Tablet/desktop: table */}
      <div className="mt-6 hidden overflow-x-auto rounded-2xl border border-zinc-200 bg-white shadow-sm md:block">
        <table className="w-full text-left text-sm">
          <thead className="bg-zinc-50 text-zinc-500">
            <tr>
              <th className="px-5 py-3.5 font-semibold">Customer</th>
              <th className="px-5 py-3.5 font-semibold">Address</th>
              <th className="px-5 py-3.5 font-semibold">Last Activity</th>
              <th className="px-5 py-3.5 font-semibold">Outreach</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {lapsed.map(({ customer, lastActivity }) => (
              <tr key={customer.id} className="hover:bg-zinc-50">
                <td className="px-5 py-4">
                  <Link
                    href={`/customers/${customer.id}`}
                    className="font-medium text-zinc-900 hover:underline"
                  >
                    {customer.name}
                  </Link>
                </td>
                <td className="px-5 py-4 text-zinc-600">
                  {customer.address ? <AddressLink address={customer.address} /> : "—"}
                </td>
                <td className="px-5 py-4 text-zinc-600">{daysAgo(lastActivity)} days ago</td>
                <td className="min-w-[180px] px-5 py-4">
                  {customer.email ? (
                    <SendTemplatedEmailButton
                      id={customer.id}
                      templates={templates}
                      action={sendWinBackEmail}
                    />
                  ) : (
                    <Link
                      href={`/customers/${customer.id}/edit`}
                      className="text-xs font-semibold text-brand hover:underline"
                    >
                      Add an email to send outreach
                    </Link>
                  )}
                  {customer.lastWinBackEmailSentAt && (
                    <p className="mt-1 text-xs text-zinc-400">
                      Sent {customer.lastWinBackEmailSentAt.toLocaleDateString()}
                    </p>
                  )}
                </td>
              </tr>
            ))}
            {lapsed.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-zinc-400">
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
