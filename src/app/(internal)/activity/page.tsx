import { db } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { Avatar } from "@/components/Avatar";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 100;

// Where a given entity type's detail page lives, so a log row can link
// straight to the thing it happened to. Entities with no detail page
// (Document, LeadEmailSend, Organization, etc.) just render unlinked.
const ENTITY_HREF: Record<string, (id: string) => string> = {
  Booking: (id) => `/bookings/${id}`,
  Invoice: (id) => `/invoices/${id}`,
  Customer: (id) => `/customers/${id}`,
  Quote: (id) => `/quotes/${id}`,
  EquipmentItem: (id) => `/equipment/${id}`,
  Expense: (id) => `/expenses/${id}`,
};

// "invoice.marked_paid" -> "Invoice marked paid" — good enough to read at a
// glance without a hand-maintained label for every action string logAction()
// has ever been called with.
function humanizeAction(action: string): string {
  const withSpaces = action.replace(/[._]/g, " ");
  return withSpaces.charAt(0).toUpperCase() + withSpaces.slice(1);
}

function timeAgo(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

export default async function ActivityPage() {
  const user = await requireUser();

  // AuditLog has no organizationId of its own — it's scoped by joining
  // through the user who performed the action, same as any other row
  // reached through an already-scoped parent (see tenantGuard.ts).
  const entries = await db.auditLog.findMany({
    where: { user: { organizationId: user.effectiveOrganizationId } },
    orderBy: { createdAt: "desc" },
    take: PAGE_SIZE,
    include: { user: { select: { id: true, name: true, avatarUrl: true } } },
  });

  return (
    <div>
      <h1 className="text-3xl font-black tracking-tight text-ink">Activity Log</h1>
      <p className="mt-1 text-sm text-zinc-500">
        Who changed what, most recent first. Shows the last {PAGE_SIZE} actions
        across your team.
      </p>

      <div className="mt-6 flex flex-col divide-y-2 divide-zinc-100 rounded-lg border-2 border-zinc-900 bg-white">
        {entries.map((entry) => {
          const href = entry.entityId ? ENTITY_HREF[entry.entity]?.(entry.entityId) : undefined;
          const content = (
            <>
              <Avatar userId={entry.user.id} name={entry.user.name} avatarUrl={entry.user.avatarUrl} size={36} />
              <div className="min-w-0 flex-1">
                <p className="text-sm text-zinc-900">
                  <span className="font-bold">{entry.user.name}</span>{" "}
                  {humanizeAction(entry.action).toLowerCase()}
                </p>
                <p className="text-xs text-zinc-400">{timeAgo(entry.createdAt)}</p>
              </div>
            </>
          );
          const rowClass = "flex items-center gap-3 px-5 py-3";
          return href ? (
            <a key={entry.id} href={href} className={`${rowClass} hover:bg-zinc-50`}>
              {content}
            </a>
          ) : (
            <div key={entry.id} className={rowClass}>
              {content}
            </div>
          );
        })}
        {entries.length === 0 && (
          <p className="px-5 py-8 text-center text-zinc-400">No activity yet.</p>
        )}
      </div>
    </div>
  );
}
