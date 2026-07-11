import Link from "next/link";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { hasPermission, requireUser } from "@/lib/session";
import { CustomerTabs } from "@/components/CustomerTabs";
import { EmailTemplateManager } from "@/components/EmailTemplateManager";
import { WinBackList } from "@/components/WinBackList";
import { getWinBackSettings } from "@/lib/winbackSettings";
import {
  sendWinBackEmailBulk,
  updateWinBackSendStatus,
  createWinBackEmailTemplate,
  deleteWinBackEmailTemplate,
} from "../winbackActions";

export const dynamic = "force-dynamic";

const MONTH_FILTERS = [3, 6, 12] as const;

function daysAgoText(date: Date) {
  const days = Math.floor((Date.now() - date.getTime()) / (1000 * 60 * 60 * 24));
  return `${days} days ago`;
}

export default async function WinBackPage({
  searchParams,
}: {
  searchParams: Promise<{ months?: string }>;
}) {
  const user = await requireUser();
  if (!hasPermission(user, "canManageLeads")) redirect("/");

  const { months } = await searchParams;
  const selectedMonths = months ? Number(months) : null;
  const usingMonthFilter =
    selectedMonths !== null && (MONTH_FILTERS as readonly number[]).includes(selectedMonths);

  const [settings, customers, templates] = await Promise.all([
    getWinBackSettings(user.effectiveOrganizationId),
    db.customer.findMany({
      where: { organizationId: user.effectiveOrganizationId },
      include: {
        bookings: { include: { items: { select: { startDate: true } } } },
        invoices: { select: { issueDate: true } },
        winBackSends: { orderBy: { sentAt: "desc" }, take: 1 },
      },
    }),
    db.winBackEmailTemplate.findMany({
      where: { organizationId: user.effectiveOrganizationId },
      orderBy: { name: "asc" },
    }),
  ]);

  let cutoff: Date;
  if (usingMonthFilter) {
    cutoff = new Date();
    cutoff.setMonth(cutoff.getMonth() - selectedMonths);
  } else {
    cutoff = new Date(Date.now() - settings.lapsedDays * 24 * 60 * 60 * 1000);
  }

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

  const rows = lapsed.map(({ customer, lastActivity }) => ({
    id: customer.id,
    name: customer.name,
    address: customer.address,
    email: customer.email,
    daysAgoText: daysAgoText(lastActivity),
    latestSend: customer.winBackSends[0]
      ? {
          id: customer.winBackSends[0].id,
          status: customer.winBackSends[0].status,
          sentAtText: customer.winBackSends[0].sentAt.toLocaleDateString(),
        }
      : null,
  }));

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-ink">Win-Back</h1>
          <p className="mt-1 text-zinc-500">
            Customers with no activity in the last{" "}
            {usingMonthFilter ? `${selectedMonths} months` : `${settings.lapsedDays} days`}. The
            default threshold is set in{" "}
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

      <div className="mt-4 flex flex-wrap gap-2">
        <Link
          href="/customers/winback"
          className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
            !usingMonthFilter
              ? "bg-ink text-white"
              : "border border-zinc-300 text-zinc-700 hover:bg-zinc-50"
          }`}
        >
          Default ({settings.lapsedDays} days)
        </Link>
        {MONTH_FILTERS.map((m) => (
          <Link
            key={m}
            href={`/customers/winback?months=${m}`}
            className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
              usingMonthFilter && selectedMonths === m
                ? "bg-ink text-white"
                : "border border-zinc-300 text-zinc-700 hover:bg-zinc-50"
            }`}
          >
            {m} Months
          </Link>
        ))}
      </div>

      <div className="mt-6">
        <EmailTemplateManager
          templates={templates}
          placeholderToken="{{customerName}}"
          addAction={createWinBackEmailTemplate}
          removeAction={deleteWinBackEmailTemplate}
        />
      </div>

      <div className="mt-6">
        <WinBackList
          rows={rows}
          templates={templates}
          sendBulkAction={sendWinBackEmailBulk}
          updateStatusAction={updateWinBackSendStatus}
        />
      </div>
    </div>
  );
}
