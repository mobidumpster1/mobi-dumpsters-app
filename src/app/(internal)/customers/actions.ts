"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { str } from "@/lib/formData";
import { normalizeTagsInput } from "@/lib/tags";
import { geocodeAddress } from "@/lib/geocode";

export async function createCustomer(formData: FormData) {
  const name = str(formData, "name");
  if (!name) throw new Error("Name is required");

  const address = str(formData, "address");
  const geocoded = address ? await geocodeAddress(address) : null;

  const customer = await db.customer.create({
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
    },
  });

  redirect(`/customers/${customer.id}`);
}

export async function updateCustomer(customerId: string, formData: FormData) {
  const name = str(formData, "name");
  if (!name) throw new Error("Name is required");

  const address = str(formData, "address");
  const geocoded = address ? await geocodeAddress(address) : null;

  await db.customer.update({
    where: { id: customerId },
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
    },
  });

  redirect(`/customers/${customerId}`);
}

export async function addCustomerNote(customerId: string, formData: FormData) {
  const content = str(formData, "content");
  if (!content) throw new Error("Note content is required");
  const type = str(formData, "type") ?? "note";

  await db.customerNote.create({
    data: { customerId, content, type },
  });

  revalidatePath(`/customers/${customerId}`);
}
