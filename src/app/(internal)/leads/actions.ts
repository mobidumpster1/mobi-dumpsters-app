"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { str } from "@/lib/formData";
import { searchPlaces } from "@/lib/places";

// Runs a Places search and upserts each match into the saved lead list.
// Upsert-by-placeId means re-running the same (or an overlapping) search
// never creates duplicates — it just refreshes name/phone/address/etc. on
// existing leads and leaves their status/notes untouched.
export async function searchAndSaveLeads(formData: FormData) {
  const query = str(formData, "query");
  if (!query) throw new Error("Search is required");

  const results = await searchPlaces(query);

  for (const result of results) {
    await db.lead.upsert({
      where: { placeId: result.placeId },
      create: {
        placeId: result.placeId,
        name: result.name,
        phone: result.phone,
        address: result.address,
        website: result.website,
        category: result.category,
        rating: result.rating,
        searchQuery: query,
      },
      update: {
        name: result.name,
        phone: result.phone,
        address: result.address,
        website: result.website,
        category: result.category,
        rating: result.rating,
      },
    });
  }

  revalidatePath("/leads");
}

export async function updateLeadStatus(leadId: string, status: string) {
  await db.lead.update({
    where: { id: leadId },
    data: {
      status,
      contactedAt: status === "contacted" ? new Date() : undefined,
    },
  });

  revalidatePath("/leads");
}

export async function updateLeadNotes(leadId: string, formData: FormData) {
  await db.lead.update({
    where: { id: leadId },
    data: { notes: str(formData, "notes") },
  });

  revalidatePath("/leads");
}

export async function deleteLead(leadId: string) {
  await db.lead.delete({ where: { id: leadId } });
  revalidatePath("/leads");
}
