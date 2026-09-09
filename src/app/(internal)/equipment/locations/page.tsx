import Link from "next/link";
import { db } from "@/lib/db";
import { EquipmentTabs } from "@/components/EquipmentTabs";
import { requireUser } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function LocationsPage() {
  const user = await requireUser();
  const locations = await db.location.findMany({
    where: { organizationId: user.effectiveOrganizationId },
    orderBy: { name: "asc" },
    include: { equipmentItems: { select: { id: true } } },
  });

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-ink">
            Locations
          </h1>
          <p className="mt-1 text-sm text-zinc-500">
            The depots/yards equipment can be based out of. Only needed if
            you run more than one — everything defaults to your main yard
            until you assign an item to one of these.
          </p>
        </div>
        <Link
          href="/equipment/locations/new"
          className="rounded-lg bg-brand px-5 py-3 text-sm font-bold text-white transition-colors hover:bg-brand-dark"
        >
          + New Location
        </Link>
      </div>

      <div className="mt-4">
        <EquipmentTabs />
      </div>

      <div className="mt-6 flex flex-col gap-3">
        {locations.map((location) => (
          <Link
            key={location.id}
            href={`/equipment/locations/${location.id}/edit`}
            className="rounded-lg border-2 border-zinc-900 bg-white p-5 hover:border-zinc-300"
          >
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="font-medium text-zinc-900">{location.name}</h2>
              <span className="text-sm text-zinc-500">
                {location.equipmentItems.length} item
                {location.equipmentItems.length === 1 ? "" : "s"}
              </span>
            </div>
            <p className="mt-1 text-sm text-zinc-500">{location.address}</p>
          </Link>
        ))}
        {locations.length === 0 && (
          <p className="text-zinc-400">
            No extra locations yet — everything&apos;s at your main yard.
          </p>
        )}
      </div>
    </div>
  );
}
