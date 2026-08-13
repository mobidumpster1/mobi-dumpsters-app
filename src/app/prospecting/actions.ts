"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { str } from "@/lib/formData";
import { searchPlaces } from "@/lib/places";
import { requirePermission, requirePlanFor } from "@/lib/session";
import { PROSPECT_SOURCE } from "@/lib/prospecting";

export async function searchProspects(formData: FormData) {
  const user = await requirePermission("canManageLeads");
  requirePlanFor(user, "pro");

  const query = str(formData, "query");
  if (!query) throw new Error("Search is required");

  // Logged before results are known, matching searchAndSaveLeads — a
  // zero-result search still bills Google, and shares the same monthly
  // free-quota pool as the main Leads search.
  if (process.env.GOOGLE_MAPS_API_KEY) {
    await db.placesSearchLog.create({
      data: { organizationId: user.effectiveOrganizationId, query },
    });
  }

  const results = await searchPlaces(query);

  for (const result of results) {
    await db.lead.upsert({
      where: { placeId: result.placeId },
      create: {
        organizationId: user.effectiveOrganizationId,
        placeId: result.placeId,
        name: result.name,
        phone: result.phone,
        address: result.address,
        latitude: result.latitude,
        longitude: result.longitude,
        website: result.website,
        category: result.category,
        rating: result.rating,
        searchQuery: query,
        source: PROSPECT_SOURCE,
      },
      update: {
        name: result.name,
        phone: result.phone,
        address: result.address,
        latitude: result.latitude,
        longitude: result.longitude,
        website: result.website,
        category: result.category,
        rating: result.rating,
      },
    });
  }

  revalidatePath("/prospecting");
}
