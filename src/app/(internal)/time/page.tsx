import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { hasPermission, hasPlan, requireUser } from "@/lib/session";
import { computeLaborCost, entryHours } from "@/lib/timeTracking";
import { ClockInOutButton } from "@/components/ClockInOutButton";
import { ManualTimeEntryForm } from "@/components/ManualTimeEntryForm";
import { TimeEntryRow } from "@/components/TimeEntryRow";

export const dynamic = "force-dynamic";

function startOfWeek() {
  const d = new Date();
  const day = d.getDay();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - day);
  return d;
}

function startOfMonth() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(1);
  return d;
}

export default async function TimePage() {
  const user = await requireUser();
  if (!hasPlan(user, "pro")) redirect("/");

  const canSeeAll = hasPermission(user, "canManageTime");

  const [entries, staffUsers, openEntry] = await Promise.all([
    db.timeEntry.findMany({
      where: canSeeAll
        ? { organizationId: user.effectiveOrganizationId }
        : { organizationId: user.effectiveOrganizationId, userId: user.id },
      orderBy: { clockIn: "desc" },
      include: { user: true, booking: { include: { customer: true } } },
    }),
    canSeeAll
      ? db.user.findMany({
          where: { organizationId: user.effectiveOrganizationId, active: true },
          orderBy: { name: "asc" },
        })
      : Promise.resolve(null),
    db.timeEntry.findFirst({
      where: { userId: user.id, organizationId: user.effectiveOrganizationId, clockOut: null },
    }),
  ]);

  const weekStart = startOfWeek();
  const monthStart = startOfMonth();
  const weekTotals = computeLaborCost(entries.filter((e) => e.clockIn >= weekStart));
  const monthTotals = computeLaborCost(entries.filter((e) => e.clockIn >= monthStart));

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-ink">Track Time</h1>
          <p className="mt-1 text-zinc-500">
            {canSeeAll
              ? "Clocked hours for everyone on staff, snapshotted against each person's hourly rate at the time."
              : "Your clocked hours, snapshotted against your hourly rate at the time."}
          </p>
        </div>
        <ClockInOutButton openEntryId={openEntry?.id ?? null} />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="rounded-lg border-2 border-zinc-900 bg-white p-5">
          <p className="text-sm text-zinc-500">This Week</p>
          <p className="mt-1 text-2xl font-semibold text-zinc-900">
            {weekTotals.hours.toFixed(1)} hrs
          </p>
          {canSeeAll && (
            <p className="text-sm text-zinc-500">${weekTotals.cost.toFixed(2)} labor cost</p>
          )}
        </div>
        <div className="rounded-lg border-2 border-zinc-900 bg-white p-5">
          <p className="text-sm text-zinc-500">This Month</p>
          <p className="mt-1 text-2xl font-semibold text-zinc-900">
            {monthTotals.hours.toFixed(1)} hrs
          </p>
          {canSeeAll && (
            <p className="text-sm text-zinc-500">${monthTotals.cost.toFixed(2)} labor cost</p>
          )}
        </div>
      </div>

      <h2 className="mt-8 text-xl font-black text-ink">Add a Manual Entry</h2>
      <div className="mt-3 rounded-lg border-2 border-zinc-900 bg-white p-5">
        <ManualTimeEntryForm
          userOptions={staffUsers ? staffUsers.map((u) => ({ id: u.id, name: u.name })) : null}
        />
      </div>

      <h2 className="mt-8 text-xl font-black text-ink">Entries</h2>
      <div className="mt-3 flex flex-col gap-3">
        {entries.map((entry) => (
          <TimeEntryRow
            key={entry.id}
            entry={{
              id: entry.id,
              userName: entry.user.name,
              clockIn: entry.clockIn,
              clockOut: entry.clockOut,
              hours: entryHours(entry),
              notes: entry.notes,
              bookingLabel: entry.booking ? entry.booking.customer.name : null,
              showUser: canSeeAll,
            }}
            canEdit={entry.userId === user.id || canSeeAll}
          />
        ))}
        {entries.length === 0 && (
          <p className="rounded-2xl border border-dashed border-zinc-300 p-6 text-center text-zinc-400">
            No time entries yet.
          </p>
        )}
      </div>
    </div>
  );
}
