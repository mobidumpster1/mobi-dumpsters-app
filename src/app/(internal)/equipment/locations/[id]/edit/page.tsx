import { notFound } from "next/navigation";
import Link from "next/link";
import { db } from "@/lib/db";
import { updateLocation, deleteLocation } from "../../actions";
import { Field, inputClass } from "@/components/Field";
import { requireUser } from "@/lib/session";

export default async function EditLocationPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await requireUser();
  const location = await db.location.findFirst({
    where: { id, organizationId: user.effectiveOrganizationId },
    include: { equipmentItems: { select: { id: true } } },
  });
  if (!location) notFound();

  const updateWithId = updateLocation.bind(null, location.id);
  const deleteWithId = deleteLocation.bind(null, location.id);

  return (
    <div className="max-w-2xl">
      <h1 className="text-3xl font-black tracking-tight text-ink">Edit Location</h1>
      <form action={updateWithId} className="mt-6 flex flex-col gap-4">
        <Field label="Name" htmlFor="name">
          <input
            id="name"
            name="name"
            required
            defaultValue={location.name}
            className={inputClass}
          />
        </Field>
        <Field label="Address" htmlFor="address">
          <input
            id="address"
            name="address"
            required
            defaultValue={location.address}
            className={inputClass}
          />
        </Field>
        <Field label="Notes (optional)" htmlFor="notes">
          <textarea
            id="notes"
            name="notes"
            rows={2}
            defaultValue={location.notes ?? ""}
            className={inputClass}
          />
        </Field>
        <div className="flex gap-3">
          <button
            type="submit"
            className="rounded-lg bg-brand px-5 py-3 text-sm font-bold text-white transition-colors hover:bg-brand-dark"
          >
            Save Location
          </button>
          <Link
            href="/equipment/locations"
            className="rounded-xl border border-zinc-300 px-5 py-3 text-sm font-semibold text-zinc-700 transition-colors hover:bg-zinc-50"
          >
            Cancel
          </Link>
        </div>
      </form>

      <form action={deleteWithId} className="mt-6 border-t border-zinc-200 pt-6">
        <p className="text-xs text-zinc-500">
          {location.equipmentItems.length > 0
            ? `${location.equipmentItems.length} item${location.equipmentItems.length === 1 ? "" : "s"} assigned — reassign or clear their location before deleting.`
            : "No equipment assigned to this location."}
        </p>
        <button
          type="submit"
          disabled={location.equipmentItems.length > 0}
          className="mt-2 text-sm font-semibold text-red-600 hover:underline disabled:cursor-not-allowed disabled:text-zinc-300 disabled:no-underline"
        >
          Delete Location
        </button>
      </form>
    </div>
  );
}
