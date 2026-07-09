"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { str } from "@/lib/formData";
import { searchPlaces } from "@/lib/places";
import { requirePermission } from "@/lib/session";
import { logAction } from "@/lib/auditLog";

// Runs a Places search and upserts each match into the saved lead list.
// Upsert-by-placeId means re-running the same (or an overlapping) search
// never creates duplicates — it just refreshes name/phone/address/etc. on
// existing leads and leaves their status/notes untouched.
//
// If any Service Areas are saved, the typed query is run once per area
// (e.g. "roofers" + ["Byron, GA", "Macon, GA"] runs two separate searches)
// instead of once — each is its own billed Places call, so this multiplies
// how fast the free monthly quota gets used, in exchange for not having to
// retype the area every time.
export async function searchAndSaveLeads(formData: FormData) {
  await requirePermission("canManageLeads");

  const query = str(formData, "query");
  if (!query) throw new Error("Search is required");
  const tradeCategory = query.trim().toLowerCase();

  const areas = await db.serviceArea.findMany({ orderBy: { name: "asc" } });
  const searches =
    areas.length > 0 ? areas.map((area) => `${query} near ${area.name}`) : [query];

  for (const fullQuery of searches) {
    // Logged before the results are known so the free-quota count reflects
    // every call actually billed by Google, not just the ones that found
    // matches — a zero-result search still uses up one of the 1,000 free
    // Enterprise-tier calls for the month.
    if (process.env.GOOGLE_MAPS_API_KEY) {
      await db.placesSearchLog.create({ data: { query: fullQuery } });
    }

    const results = await searchPlaces(fullQuery);

    for (const result of results) {
      await db.lead.upsert({
        where: { placeId: result.placeId },
        create: {
          placeId: result.placeId,
          name: result.name,
          phone: result.phone,
          address: result.address,
          latitude: result.latitude,
          longitude: result.longitude,
          website: result.website,
          category: result.category,
          tradeCategory,
          rating: result.rating,
          searchQuery: fullQuery,
        },
        update: {
          name: result.name,
          phone: result.phone,
          address: result.address,
          latitude: result.latitude,
          longitude: result.longitude,
          website: result.website,
          category: result.category,
          tradeCategory,
          rating: result.rating,
        },
      });
    }
  }

  revalidatePath("/leads");
}

export async function updateLeadStatus(leadId: string, status: string) {
  await requirePermission("canManageLeads");

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
  await requirePermission("canManageLeads");

  await db.lead.update({
    where: { id: leadId },
    data: { notes: str(formData, "notes") },
  });

  revalidatePath("/leads");
}

export async function deleteLead(leadId: string) {
  await requirePermission("canManageLeads");

  await db.lead.delete({ where: { id: leadId } });
  await logAction("lead.deleted", "Lead", leadId);
  revalidatePath("/leads");
}

export async function addServiceArea(formData: FormData) {
  await requirePermission("canManageLeads");

  const name = str(formData, "name");
  if (!name) throw new Error("Area name is required");

  await db.serviceArea.upsert({
    where: { name },
    create: { name },
    update: {},
  });

  revalidatePath("/leads");
}

export async function removeServiceArea(areaId: string) {
  await requirePermission("canManageLeads");

  await db.serviceArea.delete({ where: { id: areaId } });
  revalidatePath("/leads");
}
