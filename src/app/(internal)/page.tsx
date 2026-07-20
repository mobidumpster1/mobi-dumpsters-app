import Link from "next/link";
import { db } from "@/lib/db";
import { formatDateAndTime } from "@/lib/date";
import { markDelivered, markReturned, resolveServiceRequest } from "./bookings/actions";
import { LocationMap } from "@/components/LocationMap";
import { AddressLink } from "@/components/AddressLink";
import { DirectionsButton } from "@/components/DirectionsButton";
import { RouteDirectionsButton } from "@/components/RouteDirectionsButton";
import { nearestNeighborRoute } from "@/lib/routeOptimizer";
import { branding } from "@/lib/branding";
import {
  DOCUMENT_EXPIRY_ALERT_DAYS,
  DOCUMENT_TYPE_LABELS,
  documentUrgency,
  utcStartOfToday,
} from "@/lib/documents";
import { MAINTENANCE_DUE_ALERT_DAYS, MAINTENANCE_TYPE_LABELS, maintenanceUrgency } from "@/lib/maintenance";
import { requireUser, hasPlan } from "@/lib/session";
import { PlanGateNotice } from "@/components/PlanGateNotice";
import { inputClass } from "@/components/Field";

export const dynamic = "force-dynamic";

function startOfToday() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

function daysFromNow(days: number) {
  const d = startOfToday();
  d.setDate(d.getDate() + days);
  return d;
}

function urgency(date: Date, today: Date) {
  const diffDays = Math.round((date.getTime() - today.getTime()) / 86400000);
  if (diffDays < 0) {
    return { text: `${Math.abs(diffDays)}d overdue`, className: "text-red-600 font-semibold" };
  }
  if (diffDays === 0) return { text: "Today", className: "text-amber-600 font-semibold" };
  return { text: `In ${diffDays}d`, className: "text-zinc-500" };
}

function DispatchCard({
  date,
  urgencyText,
  urgencyClassName,
  itemLabel,
  itemHref,
  customerName,
  customerHref,
  address,
  actionLabel,
  action,
  extraFormFields,
}: {
  date: string;
  urgencyText: string;
  urgencyClassName: string;
  itemLabel: string;
  itemHref: string;
  customerName: string;
  customerHref: string;
  address: string;
  actionLabel: string;
  action: (formData: FormData) => void;
  extraFormFields?: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border-2 border-zinc-900 bg-white p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <span className="text-sm font-semibold text-zinc-900">{date}</span>
        <span className={`text-xs ${urgencyClassName}`}>{urgencyText}</span>
      </div>
      <div className="mt-2">
        <Link
          href={customerHref}
          className="text-base font-semibold text-ink hover:underline"
        >
          {customerName}
        </Link>
        <p className="text-sm text-zinc-600">
          <Link href={itemHref} className="hover:underline">
            {itemLabel}
          </Link>
        </p>
        <p className="mt-1 text-sm text-zinc-500">
          <AddressLink address={address} />
        </p>
      </div>
      <div className="mt-4 flex flex-wrap items-end gap-4">
        <form action={action} className="flex flex-col gap-2">
          {extraFormFields}
          <button
            type="submit"
            className="self-start text-sm font-semibold text-brand hover:underline"
          >
            {actionLabel}
          </button>
        </form>
        <DirectionsButton address={address} />
      </div>
    </div>
  );
}

export default async function DispatchPage() {
  const user = await requireUser();
  const canRouteOptimize = hasPlan(user, "pro");
  const today = startOfToday();
  const weekEnd = daysFromNow(7);
  const docToday = utcStartOfToday();
  const docAlertCutoff = new Date(docToday);
  docAlertCutoff.setUTCDate(docAlertCutoff.getUTCDate() + DOCUMENT_EXPIRY_ALERT_DAYS);
  const maintenanceAlertCutoff = new Date(docToday);
  maintenanceAlertCutoff.setUTCDate(maintenanceAlertCutoff.getUTCDate() + MAINTENANCE_DUE_ALERT_DAYS);

  const [
    deliveries,
    pickups,
    activeBookings,
    pendingBookings,
    serviceRequests,
    expiringDocuments,
    dueMaintenanceEntries,
  ] = await Promise.all([
      db.bookingItem.findMany({
        where: {
          deliveredAt: null,
          startDate: { lte: weekEnd },
          booking: { status: "confirmed", organizationId: user.effectiveOrganizationId },
        },
        include: { equipmentItem: true, booking: { include: { customer: true } } },
        orderBy: { startDate: "asc" },
      }),
      db.bookingItem.findMany({
        where: {
          actualReturnDate: null,
          expectedReturnDate: { lte: weekEnd },
          booking: { status: "confirmed", organizationId: user.effectiveOrganizationId },
        },
        include: { equipmentItem: true, booking: { include: { customer: true } } },
        orderBy: { expectedReturnDate: "asc" },
      }),
      db.booking.findMany({
        where: {
          status: "confirmed",
          latitude: { not: null },
          longitude: { not: null },
          items: { some: { deliveredAt: { not: null }, actualReturnDate: null } },
          organizationId: user.effectiveOrganizationId,
        },
        include: { customer: true },
      }),
      db.booking.findMany({
        where: { status: "pending", organizationId: user.effectiveOrganizationId },
        include: { customer: true, items: { include: { equipmentItem: true } } },
        orderBy: { createdAt: "asc" },
      }),
      db.serviceRequest.findMany({
        where: { status: "pending", booking: { organizationId: user.effectiveOrganizationId } },
        include: { booking: { include: { customer: true } } },
        orderBy: { createdAt: "asc" },
      }),
      db.document.findMany({
        where: { expiresOn: { lte: docAlertCutoff }, organizationId: user.effectiveOrganizationId },
        include: { vehicle: true },
        orderBy: { expiresOn: "asc" },
      }),
      db.maintenanceLogEntry.findMany({
        where: {
          nextServiceDue: { lte: maintenanceAlertCutoff },
          organizationId: user.effectiveOrganizationId,
        },
        include: { vehicle: true, equipmentItem: true },
        orderBy: { nextServiceDue: "asc" },
      }),
    ]);

  // Pin both equipment that's already out at a site and deliveries that are
  // scheduled but haven't happened yet, so the map is useful for planning
  // today's route, not just tracking what's already deployed.
  const pinsByBooking = new Map<
    string,
    { id: string; lat: number; lng: number; label: string; href: string }
  >();
  for (const b of activeBookings) {
    pinsByBooking.set(b.id, {
      id: b.id,
      lat: b.latitude as number,
      lng: b.longitude as number,
      label: `${b.customer.name} — ${b.deliveryAddress}`,
      href: `/bookings/${b.id}`,
    });
  }
  for (const item of deliveries) {
    const booking = item.booking;
    if (booking.latitude == null || booking.longitude == null) continue;
    if (pinsByBooking.has(booking.id)) continue;
    pinsByBooking.set(booking.id, {
      id: booking.id,
      lat: booking.latitude,
      lng: booking.longitude,
      label: `Scheduled: ${booking.customer.name} — ${booking.deliveryAddress}`,
      href: `/bookings/${booking.id}`,
    });
  }
  const pins = Array.from(pinsByBooking.values());

  // Today's suggested route: every delivery/pickup due today or overdue,
  // combined into one loop (a truck usually does both in the same run),
  // ordered with a free greedy nearest-neighbor pass starting from the
  // yard — recomputed on every load, not persisted or reorderable in v1.
  const todayEnd = daysFromNow(1);
  type RouteStopInfo = {
    id: string;
    lat: number;
    lng: number;
    customerName: string;
    address: string;
    href: string;
    kind: "Delivery" | "Pickup";
  };
  const stopsByBooking = new Map<string, RouteStopInfo>();
  for (const item of deliveries) {
    const booking = item.booking;
    if (booking.latitude == null || booking.longitude == null) continue;
    if (item.startDate.getTime() >= todayEnd.getTime()) continue;
    if (stopsByBooking.has(booking.id)) continue;
    stopsByBooking.set(booking.id, {
      id: booking.id,
      lat: booking.latitude,
      lng: booking.longitude,
      customerName: booking.customer.name,
      address: booking.deliveryAddress,
      href: `/bookings/${booking.id}`,
      kind: "Delivery",
    });
  }
  for (const item of pickups) {
    const booking = item.booking;
    if (booking.latitude == null || booking.longitude == null) continue;
    if (item.expectedReturnDate.getTime() >= todayEnd.getTime()) continue;
    if (stopsByBooking.has(booking.id)) continue;
    stopsByBooking.set(booking.id, {
      id: booking.id,
      lat: booking.latitude,
      lng: booking.longitude,
      customerName: booking.customer.name,
      address: booking.deliveryAddress,
      href: `/bookings/${booking.id}`,
      kind: "Pickup",
    });
  }
  const todaysStops = Array.from(stopsByBooking.values());
  const yard = { lat: branding.yardLatitude, lng: branding.yardLongitude };
  const routeOrder = nearestNeighborRoute(yard, todaysStops);
  const orderedStops = routeOrder
    .map((id) => todaysStops.find((s) => s.id === id))
    .filter((s): s is RouteStopInfo => s != null);
  const routePins = orderedStops.map((stop, i) => ({
    id: stop.id,
    lat: stop.lat,
    lng: stop.lng,
    label: `${i + 1}. ${stop.kind}: ${stop.customerName} — ${stop.address}`,
    href: stop.href,
  }));

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-3xl font-black tracking-tight text-ink">Dispatch</h1>
        <p className="mt-1 text-zinc-500">
          What&apos;s due for delivery or pickup/return, today and this week.
        </p>
      </div>

      {pendingBookings.length > 0 && (
        <section className="rounded-lg border-2 border-amber-600 bg-amber-50 p-5">
          <h2 className="text-xl font-black text-ink">
            {pendingBookings.length} New Booking Request
            {pendingBookings.length === 1 ? "" : "s"} Awaiting Review
          </h2>
          <div className="mt-3 flex flex-col gap-2">
            {pendingBookings.map((booking) => (
              <Link
                key={booking.id}
                href={`/bookings/${booking.id}`}
                className="flex items-center justify-between rounded-xl bg-white px-4 py-3 shadow-sm hover:bg-amber-50/50"
              >
                <span className="font-medium text-zinc-900">
                  {booking.customer.name}
                </span>
                <span className="text-sm text-zinc-500">
                  {booking.items.map((item) => item.equipmentItem.label).join(", ")}
                </span>
              </Link>
            ))}
          </div>
        </section>
      )}

      {serviceRequests.length > 0 && (
        <section className="rounded-lg border-2 border-amber-600 bg-amber-50 p-5">
          <h2 className="text-xl font-black text-ink">
            {serviceRequests.length} Service Request
            {serviceRequests.length === 1 ? "" : "s"}
          </h2>
          <div className="mt-3 flex flex-col gap-2">
            {serviceRequests.map((req) => (
              <div
                key={req.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-white px-4 py-3 shadow-sm"
              >
                <div>
                  <Link
                    href={`/bookings/${req.bookingId}`}
                    className="font-medium text-zinc-900 hover:underline"
                  >
                    {req.booking.customer.name}
                  </Link>
                  <p className="text-sm text-zinc-500">
                    {req.type === "extension" ? "Wants more time" : "Wants dump & return"}
                    {req.details ? ` — ${req.details}` : ""}
                  </p>
                </div>
                <form action={resolveServiceRequest.bind(null, req.id)}>
                  <button
                    type="submit"
                    className="rounded-lg border border-zinc-300 px-3 py-1.5 text-xs font-semibold text-zinc-700 transition-colors hover:bg-zinc-50"
                  >
                    Mark Handled
                  </button>
                </form>
              </div>
            ))}
          </div>
        </section>
      )}

      {expiringDocuments.length > 0 && (
        <section className="rounded-lg border-2 border-red-600 bg-red-50 p-5">
          <h2 className="text-xl font-black text-ink">
            {expiringDocuments.length} Document{expiringDocuments.length === 1 ? "" : "s"} Expiring
            Soon
          </h2>
          <div className="mt-3 flex flex-col gap-2">
            {expiringDocuments.map((doc) => {
              const u = documentUrgency(doc.expiresOn, docToday);
              return (
                <Link
                  key={doc.id}
                  href="/documents"
                  className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-white px-4 py-3 shadow-sm hover:bg-red-50/50"
                >
                  <div>
                    <span className="font-medium text-zinc-900">{doc.name}</span>
                    <span className="ml-2 text-sm text-zinc-500">
                      {DOCUMENT_TYPE_LABELS[doc.type] ?? doc.type}
                      {doc.vehicle ? ` — ${doc.vehicle.label}` : ""}
                    </span>
                  </div>
                  <span className={`text-sm ${u.className}`}>{u.text}</span>
                </Link>
              );
            })}
          </div>
        </section>
      )}

      {dueMaintenanceEntries.length > 0 && (
        <section className="rounded-lg border-2 border-amber-500 bg-amber-50 p-5">
          <h2 className="text-xl font-black text-ink">
            {dueMaintenanceEntries.length} Service{dueMaintenanceEntries.length === 1 ? "" : "s"} Due
            Soon
          </h2>
          <div className="mt-3 flex flex-col gap-2">
            {dueMaintenanceEntries.map((entry) => {
              const u = maintenanceUrgency(entry.nextServiceDue!, docToday);
              return (
                <Link
                  key={entry.id}
                  href="/maintenance"
                  className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-white px-4 py-3 shadow-sm hover:bg-amber-50/50"
                >
                  <div>
                    <span className="font-medium text-zinc-900">
                      {entry.vehicle?.label ?? entry.equipmentItem?.label ?? "—"}
                    </span>
                    <span className="ml-2 text-sm text-zinc-500">
                      {MAINTENANCE_TYPE_LABELS[entry.type] ?? entry.type}
                    </span>
                  </div>
                  <span className={`text-sm ${u.className}`}>{u.text}</span>
                </Link>
              );
            })}
          </div>
        </section>
      )}

      {todaysStops.length > 0 && (
        <section>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-xl font-black text-ink">Suggested Route</h2>
              <p className="mt-1 text-sm text-zinc-500">
                Today&apos;s deliveries and pickups, ordered for an efficient loop from the yard.
              </p>
            </div>
            {canRouteOptimize && (
              <RouteDirectionsButton
                origin={yard}
                stops={orderedStops.map((s) => ({ lat: s.lat, lng: s.lng }))}
              />
            )}
          </div>
          {canRouteOptimize ? (
            <>
              <div className="mt-3">
                <LocationMap pins={routePins} heightClassName="h-80" />
              </div>
              <ol className="mt-3 flex flex-col gap-2">
                {orderedStops.map((stop, i) => (
                  <li
                    key={stop.id}
                    className="flex items-center gap-3 rounded-lg border-2 border-zinc-900 bg-white px-4 py-3"
                  >
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand text-xs font-black text-white">
                      {i + 1}
                    </span>
                    <span
                      className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-black text-white ${
                        stop.kind === "Delivery" ? "bg-blue-600" : "bg-purple-600"
                      }`}
                    >
                      {stop.kind}
                    </span>
                    <Link href={stop.href} className="min-w-0 flex-1 hover:underline">
                      <span className="font-medium text-zinc-900">{stop.customerName}</span>
                      <span className="ml-2 text-sm text-zinc-500">{stop.address}</span>
                    </Link>
                  </li>
                ))}
              </ol>
            </>
          ) : (
            <PlanGateNotice
              requiredPlan="pro"
              description="Auto-order today's deliveries and pickups into an efficient loop from the yard, with a one-click Google Maps route."
            />
          )}
        </section>
      )}

      <section>
        <h2 className="text-xl font-black text-ink">Active Equipment Map</h2>
        <div className="mt-3">
          <LocationMap pins={pins} heightClassName="h-96" />
        </div>
      </section>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <section>
          <h2 className="text-xl font-black text-ink">Deliveries</h2>
          <div className="mt-3 flex flex-col gap-3">
            {deliveries.map((item) => {
              const u = urgency(item.startDate, today);
              return (
                <DispatchCard
                  key={item.id}
                  date={formatDateAndTime(item.startDate)}
                  urgencyText={u.text}
                  urgencyClassName={u.className}
                  itemLabel={item.equipmentItem.label}
                  itemHref={`/equipment/${item.equipmentItem.id}`}
                  customerName={item.booking.customer.name}
                  customerHref={`/bookings/${item.booking.id}`}
                  address={item.booking.deliveryAddress}
                  actionLabel="Mark Delivered"
                  action={markDelivered.bind(null, item.id)}
                />
              );
            })}
            {deliveries.length === 0 && (
              <p className="rounded-2xl border border-dashed border-zinc-300 bg-white p-6 text-center text-zinc-400">
                Nothing due for delivery.
              </p>
            )}
          </div>
        </section>

        <section>
          <h2 className="text-xl font-black text-ink">Pickups &amp; Returns</h2>
          <div className="mt-3 flex flex-col gap-3">
            {pickups.map((item) => {
              const u = urgency(item.expectedReturnDate, today);
              return (
                <DispatchCard
                  key={item.id}
                  date={formatDateAndTime(item.expectedReturnDate)}
                  urgencyText={u.text}
                  urgencyClassName={u.className}
                  itemLabel={item.equipmentItem.label}
                  itemHref={`/equipment/${item.equipmentItem.id}`}
                  customerName={item.booking.customer.name}
                  customerHref={`/bookings/${item.booking.id}`}
                  address={item.booking.deliveryAddress}
                  actionLabel="Mark Returned"
                  action={markReturned.bind(null, item.id)}
                  extraFormFields={
                    <div className="flex flex-wrap gap-2">
                      <label className="flex flex-col gap-0.5 text-xs text-zinc-500">
                        Tons (optional)
                        <input
                          type="number"
                          step="0.01"
                          name="actualTonnage"
                          className={`${inputClass} w-28 px-2.5 py-1.5 text-sm`}
                        />
                      </label>
                      <label className="flex flex-col gap-0.5 text-xs text-zinc-500">
                        Miles (optional)
                        <input
                          type="number"
                          step="0.1"
                          name="actualMileage"
                          className={`${inputClass} w-28 px-2.5 py-1.5 text-sm`}
                        />
                      </label>
                    </div>
                  }
                />
              );
            })}
            {pickups.length === 0 && (
              <p className="rounded-2xl border border-dashed border-zinc-300 bg-white p-6 text-center text-zinc-400">
                Nothing due for pickup.
              </p>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
