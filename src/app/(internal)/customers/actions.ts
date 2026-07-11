"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { str } from "@/lib/formData";
import { normalizeTagsInput } from "@/lib/tags";
import { geocodeAddress } from "@/lib/geocode";
import { requireUser } from "@/lib/session";

export async function createCustomer(formData: FormData) {
  const user = await requireUser();

  const name = str(formData, "name");
  if (!name) throw new Error("Name is required");

  const address = str(formData, "address");
  const geocoded = address ? await geocodeAddress(address) : null;

  const customer = await db.customer.create({
    data: {
      organizationId: user.effectiveOrganizationId,
      name,
      companyName: str(formData, "companyName"),
      phone: str(formData, "phone"),
      email: str(formData, "email"),
      address,
      latitude: geocoded?.latitude,
      longitude: geocoded?.longitude,
      notes: str(formData, "notes"),
      tags: normalizeTagsInput(str(formData, "tags") ?? ""),
      leadSource: str(formData, "leadSource"),
    },
  });

  redirect(`/customers/${customer.id}`);
}

// Same as createCustomer, but for callers (like the inline "+ New Customer"
// picker on the New Booking screen) that want to stay on the current page
// and get the new customer back, instead of being redirected to it.
export async function quickAddCustomer(formData: FormData) {
  const user = await requireUser();

  const name = str(formData, "name");
  if (!name) throw new Error("Name is required");

  const address = str(formData, "address");
  const geocoded = address ? await geocodeAddress(address) : null;

  const customer = await db.customer.create({
    data: {
      organizationId: user.effectiveOrganizationId,
      name,
      phone: str(formData, "phone"),
      email: str(formData, "email"),
      address,
      latitude: geocoded?.latitude,
      longitude: geocoded?.longitude,
      leadSource: str(formData, "leadSource"),
    },
  });

  return { id: customer.id, name: customer.name };
}

export async function updateCustomer(customerId: string, formData: FormData) {
  const user = await requireUser();

  const name = str(formData, "name");
  if (!name) throw new Error("Name is required");

  const address = str(formData, "address");
  const geocoded = address ? await geocodeAddress(address) : null;

  await db.customer.updateMany({
    where: { id: customerId, organizationId: user.effectiveOrganizationId },
    data: {
      name,
      companyName: str(formData, "companyName"),
      phone: str(formData, "phone"),
      email: str(formData, "email"),
      address,
      latitude: geocoded?.latitude,
      longitude: geocoded?.longitude,
      notes: str(formData, "notes"),
      tags: normalizeTagsInput(str(formData, "tags") ?? ""),
      leadSource: str(formData, "leadSource"),
    },
  });

  redirect(`/customers/${customerId}`);
}

export async function addCustomerNote(customerId: string, formData: FormData) {
  const user = await requireUser();
  const content = str(formData, "content");
  if (!content) throw new Error("Note content is required");
  const type = str(formData, "type") ?? "note";

  await db.customer.findFirstOrThrow({
    where: { id: customerId, organizationId: user.effectiveOrganizationId },
  });

  await db.customerNote.create({
    data: { customerId, content, type },
  });

  revalidatePath(`/customers/${customerId}`);
}
