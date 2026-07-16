"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { str } from "@/lib/formData";
import { searchPlaces } from "@/lib/places";
import { enrichFromWebsite } from "@/lib/leadEnrichment";
import { requirePermission } from "@/lib/session";
import { logAction } from "@/lib/auditLog";
import { sendCustomerEmail } from "@/lib/email";
import { stopAllActiveEnrollmentsForLead } from "@/lib/leadSequences";
import { normalizeTagsInput } from "@/lib/tags";
import { getLeadOutreachSettings } from "@/lib/leadOutreachSettings";

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
  const user = await requirePermission("canManageLeads");

  const query = str(formData, "query");
  if (!query) throw new Error("Search is required");
  const tradeCategory = query.trim().toLowerCase();

  const allAreas = await db.serviceArea.findMany({
    where: { organizationId: user.effectiveOrganizationId },
    orderBy: { name: "asc" },
  });
  // Every checked area runs as its own Places search (and its own quota
  // hit), so only search the ones actually selected on the form rather
  // than always hitting all of them — otherwise adding a 9th service area
  // silently turns every future search into 9 API calls instead of 1.
  const selectedAreaIds = new Set(formData.getAll("areaIds").map(String));
  const areas =
    allAreas.length > 0 ? allAreas.filter((area) => selectedAreaIds.has(area.id)) : [];
  const searches =
    areas.length > 0 ? areas.map((area) => `${query} near ${area.name}`) : [query];

  for (const fullQuery of searches) {
    // Logged before the results are known so the free-quota count reflects
    // every call actually billed by Google, not just the ones that found
    // matches — a zero-result search still uses up one of the 1,000 free
    // Enterprise-tier calls for the month.
    if (process.env.GOOGLE_MAPS_API_KEY) {
      await db.placesSearchLog.create({
        data: { organizationId: user.effectiveOrganizationId, query: fullQuery },
      });
    }

    const results = await searchPlaces(fullQuery);

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
  const user = await requirePermission("canManageLeads");

  await db.lead.updateMany({
    where: { id: leadId, organizationId: user.effectiveOrganizationId },
    data: {
      status,
      contactedAt: status === "contacted" ? new Date() : undefined,
    },
  });

  // A manual status change is one of two signals that stop a sequence —
  // the other is an actual reply, handled by the inbound webhook.
  if (status !== "new") {
    await stopAllActiveEnrollmentsForLead(leadId, "status_changed");
  }

  revalidatePath("/leads");
}

export async function updateLeadNotes(leadId: string, formData: FormData) {
  const user = await requirePermission("canManageLeads");

  await db.lead.updateMany({
    where: { id: leadId, organizationId: user.effectiveOrganizationId },
    data: { notes: str(formData, "notes") },
  });

  revalidatePath("/leads");
}

export async function updateLeadTags(leadId: string, formData: FormData) {
  const user = await requirePermission("canManageLeads");

  await db.lead.updateMany({
    where: { id: leadId, organizationId: user.effectiveOrganizationId },
    data: { tags: normalizeTagsInput(str(formData, "tags") ?? "") },
  });

  revalidatePath("/leads");
}

export async function updateLeadServiceRadius(formData: FormData) {
  const user = await requirePermission("canManageLeads");
  const miles = Math.max(1, Number(str(formData, "serviceRadiusMiles")) || 30);

  const settings = await getLeadOutreachSettings(user.effectiveOrganizationId);
  await db.leadOutreachSettings.update({
    where: { id: settings.id },
    data: { serviceRadiusMiles: miles },
  });

  revalidatePath("/leads");
}

export async function updateLeadEmail(leadId: string, formData: FormData) {
  const user = await requirePermission("canManageLeads");

  await db.lead.updateMany({
    where: { id: leadId, organizationId: user.effectiveOrganizationId },
    data: { email: str(formData, "email") },
  });

  revalidatePath("/leads");
}

// Scrapes a single lead's own website for an email address and social
// links, filling in only whichever fields are still empty — anything a
// staff member already typed in by hand (via LeadEmailField, etc.) is
// left alone. Always stamps enrichedAt, even on a zero-result scrape, so
// "Enrich All" doesn't keep re-hitting the same dead/empty site.
export async function enrichLead(leadId: string) {
  const user = await requirePermission("canManageLeads");

  const lead = await db.lead.findFirstOrThrow({
    where: { id: leadId, organizationId: user.effectiveOrganizationId },
  });
  if (!lead.website) throw new Error("This lead has no website to scrape yet.");

  const result = await enrichFromWebsite(lead.website);
  await db.lead.update({
    where: { id: leadId },
    data: {
      email: lead.email ?? result.email,
      facebookUrl: lead.facebookUrl ?? result.facebookUrl,
      instagramUrl: lead.instagramUrl ?? result.instagramUrl,
      linkedinUrl: lead.linkedinUrl ?? result.linkedinUrl,
      enrichedAt: new Date(),
    },
  });

  revalidatePath("/leads");
}

// Runs the same scrape across every not-yet-attempted lead with a website,
// up to BULK_ENRICH_LIMIT per click — capped so one button press can't run
// long enough to hit a serverless function timeout — and a few sites at a
// time (not all sequentially) so a handful of slow/dead sites don't stall
// the rest.
const BULK_ENRICH_LIMIT = 20;
const BULK_ENRICH_CONCURRENCY = 5;

export async function enrichAllLeads() {
  const user = await requirePermission("canManageLeads");

  const leads = await db.lead.findMany({
    where: {
      organizationId: user.effectiveOrganizationId,
      website: { not: null },
      enrichedAt: null,
    },
    take: BULK_ENRICH_LIMIT,
    orderBy: { createdAt: "desc" },
  });

  let found = 0;
  let index = 0;
  async function worker() {
    while (index < leads.length) {
      const lead = leads[index++];
      const result = await enrichFromWebsite(lead.website as string);
      if (result.email || result.facebookUrl || result.instagramUrl || result.linkedinUrl) {
        found++;
      }
      await db.lead.update({
        where: { id: lead.id },
        data: {
          email: lead.email ?? result.email,
          facebookUrl: lead.facebookUrl ?? result.facebookUrl,
          instagramUrl: lead.instagramUrl ?? result.instagramUrl,
          linkedinUrl: lead.linkedinUrl ?? result.linkedinUrl,
          enrichedAt: new Date(),
        },
      });
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(BULK_ENRICH_CONCURRENCY, leads.length) }, worker)
  );

  revalidatePath("/leads");
  return { processed: leads.length, found };
}

// Sends a saved template to a lead, swapping {{businessName}} for their
// name. Throws (surfaced to the button that triggered it) if there's no
// email on file yet or the send itself fails — nothing silent here, since
// the whole point is a staff member clicking "Send" and knowing it worked.
export async function sendLeadEmail(leadId: string, templateId: string) {
  const user = await requirePermission("canManageLeads");

  const [lead, template] = await Promise.all([
    db.lead.findFirst({ where: { id: leadId, organizationId: user.effectiveOrganizationId } }),
    db.leadEmailTemplate.findFirst({
      where: { id: templateId, organizationId: user.effectiveOrganizationId },
    }),
  ]);

  if (!lead) {
    throw new Error("This lead no longer exists — refresh the page and try again.");
  }
  // Can happen if the template picked in the dropdown was deleted (e.g. in
  // another tab) since the page last loaded — refreshing picks up the
  // current template list instead of a stale one.
  if (!template) {
    throw new Error("That template was deleted — refresh the page and pick another one.");
  }

  if (!lead.email) {
    throw new Error("Add an email address for this lead before sending.");
  }
  if (lead.emailOptOut) {
    throw new Error("This lead has unsubscribed — no further emails, one-click or automated.");
  }

  const subject = template.subject.replaceAll("{{businessName}}", lead.name);
  const body = template.body.replaceAll("{{businessName}}", lead.name);

  const resendEmailId = await sendCustomerEmail(lead.email, subject, body);

  const sentAt = new Date();
  await db.lead.update({ where: { id: leadId }, data: { lastEmailSentAt: sentAt } });
  await db.leadEmailSend.create({
    data: { leadId, templateId, subject, sentAt, resendEmailId },
  });
  await logAction("lead.email_sent", "Lead", leadId);
  revalidatePath("/leads");
}

export async function createLeadEmailTemplate(formData: FormData) {
  const user = await requirePermission("canManageLeads");

  const name = str(formData, "name");
  const subject = str(formData, "subject");
  const body = str(formData, "body");
  if (!name || !subject || !body) {
    throw new Error("Name, subject, and body are all required.");
  }

  await db.leadEmailTemplate.create({
    data: { organizationId: user.effectiveOrganizationId, name, subject, body },
  });
  revalidatePath("/leads");
}

export async function deleteLeadEmailTemplate(templateId: string) {
  const user = await requirePermission("canManageLeads");

  await db.leadEmailTemplate.deleteMany({
    where: { id: templateId, organizationId: user.effectiveOrganizationId },
  });
  revalidatePath("/leads");
}

export async function deleteLead(leadId: string) {
  const user = await requirePermission("canManageLeads");

  await db.lead.deleteMany({ where: { id: leadId, organizationId: user.effectiveOrganizationId } });
  await logAction("lead.deleted", "Lead", leadId);
  revalidatePath("/leads");
}

// Creates a real Customer from a lead, reusing the address/coordinates
// already captured from the Places search (no re-geocoding needed) and
// tagging leadSource "b2b_outreach" automatically — the whole point of
// converting through this button instead of adding the customer by hand.
export async function convertLeadToCustomer(leadId: string) {
  const user = await requirePermission("canManageLeads");

  const lead = await db.lead.findFirstOrThrow({
    where: { id: leadId, organizationId: user.effectiveOrganizationId },
  });

  const customer = await db.customer.create({
    data: {
      organizationId: user.effectiveOrganizationId,
      name: lead.name,
      phone: lead.phone,
      address: lead.address,
      latitude: lead.latitude,
      longitude: lead.longitude,
      leadSource: "b2b_outreach",
    },
  });

  await db.lead.update({ where: { id: leadId }, data: { status: "customer" } });

  revalidatePath("/leads");
  redirect(`/customers/${customer.id}`);
}

export async function addServiceArea(formData: FormData) {
  const user = await requirePermission("canManageLeads");

  const name = str(formData, "name");
  if (!name) throw new Error("Area name is required");

  await db.serviceArea.upsert({
    where: { organizationId_name: { organizationId: user.effectiveOrganizationId, name } },
    create: { organizationId: user.effectiveOrganizationId, name },
    update: {},
  });

  revalidatePath("/leads");
}

export async function removeServiceArea(areaId: string) {
  const user = await requirePermission("canManageLeads");

  await db.serviceArea.deleteMany({
    where: { id: areaId, organizationId: user.effectiveOrganizationId },
  });
  revalidatePath("/leads");
}
