"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { str } from "@/lib/formData";
import { geocodeAddress } from "@/lib/geocode";
import { requireUser } from "@/lib/session";

export async function createLocation(formData: FormData) {
  const user = await requireUser();
  const name = str(formData, "name");
  const address = str(formData, "address");
  if (!name) throw new Error("Name is required");
  if (!address) throw new Error("Address is required");

  const geocoded = await geocodeAddress(address);

  await db.location.create({
    data: {
      organizationId: user.effectiveOrganizationId,
      name,
      address,
      latitude: geocoded?.latitude,
      longitude: geocoded?.longitude,
      notes: str(formData, "notes"),
    },
  });

  redirect("/equipment/locations");
}

export async function updateLocation(locationId: string, formData: FormData) {
  const user = await requireUser();
  const name = str(formData, "name");
  const address = str(formData, "address");
  if (!name) throw new Error("Name is required");
  if (!address) throw new Error("Address is required");

  const existing = await db.location.findFirstOrThrow({
    where: { id: locationId, organizationId: user.effectiveOrganizationId },
  });

  // Only re-geocode when the address actually changed, same reasoning as
  // updateBooking — no point spending an API call re-resolving coordinates
  // that would come back identical.
  const geocoded =
    address !== existing.address ? await geocodeAddress(address) : null;

  await db.location.update({
    where: { id: locationId },
    data: {
      name,
      address,
      notes: str(formData, "notes"),
      ...(geocoded ? { latitude: geocoded.latitude, longitude: geocoded.longitude } : {}),
    },
  });

  redirect("/equipment/locations");
}

export async function deleteLocation(locationId: string) {
  const user = await requireUser();
  const location = await db.location.findFirstOrThrow({
    where: { id: locationId, organizationId: user.effectiveOrganizationId },
    include: { equipmentItems: { select: { id: true }, take: 1 } },
  });

  if (location.equipmentItems.length > 0) {
    throw new Error(
      "This location has equipment assigned to it. Reassign or clear those items' location first."
    );
  }

  await db.location.delete({ where: { id: locationId } });

  revalidatePath("/equipment/locations");
}
