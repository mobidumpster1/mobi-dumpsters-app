import "server-only";
import { db } from "@/lib/db";
import { listBookableCategories } from "@/lib/availability";
import { getAgreementSettings } from "@/lib/agreement";
import { getStripeConnection } from "@/lib/stripe";

// "Get your booking page live": what a brand-new business still has to do,
// worked out from its real data so a step ticks itself off the moment it's
// done. The first group is what the booking page needs in order to take a
// booking; the second is recommended.

export type SetupStep = {
  id: string;
  label: string;
  hint: string;
  href: string;
  done: boolean;
  required: boolean;
};

export type SetupChecklist = {
  steps: SetupStep[];
  requiredDone: number;
  requiredTotal: number;
  complete: boolean; // every required step is done
};

const PLACEHOLDER_AGREEMENT_START = "[Placeholder";

export async function getSetupChecklist(organizationId: string): Promise<SetupChecklist> {
  const [org, categories, units, pricedCategories, bookable, agreement, stripe] = await Promise.all([
    db.organization.findUniqueOrThrow({
      where: { id: organizationId },
      select: { contactPhone: true, contactAddress: true },
    }),
    db.equipmentCategory.count({ where: { organizationId } }),
    db.equipmentItem.count({ where: { organizationId, status: { notIn: ["retired", "needs_repair"] } } }),
    db.equipmentCategory.count({
      where: {
        organizationId,
        OR: [{ basePrice: { not: null } }, { pricingTiers: { some: { price: { not: null } } } }, { materialOptions: { some: {} } }],
      },
    }),
    listBookableCategories(organizationId),
    getAgreementSettings(organizationId),
    getStripeConnection(organizationId),
  ]);

  const steps: SetupStep[] = [
    {
      id: "business",
      label: "Add your business phone and address",
      hint: "They go on invoices and in customer emails and texts.",
      href: "/settings?section=contact",
      done: Boolean(org.contactPhone && org.contactAddress),
      required: true,
    },
    {
      id: "categories",
      label: "Add what you rent",
      hint: "One category per kind of equipment, such as a 20 yard dumpster.",
      href: "/equipment/categories",
      done: categories > 0,
      required: true,
    },
    {
      id: "units",
      label: "Add the individual units you own",
      hint: "A category with no units can't be booked.",
      href: "/equipment",
      done: units > 0,
      required: true,
    },
    {
      id: "prices",
      label: "Set your prices",
      hint: "A category with no price stays hidden from your booking page.",
      href: "/equipment/categories",
      done: pricedCategories > 0,
      required: true,
    },
    {
      id: "visible",
      label: "See a rental on your booking page",
      hint: "Appears once a category has units and a price.",
      href: "/book",
      done: bookable.length > 0,
      required: true,
    },
    {
      id: "agreement",
      label: "Write your service agreement",
      hint: "Customers sign it when they book. It still says placeholder.",
      href: "/settings?section=agreement",
      done: !agreement.content.trimStart().startsWith(PLACEHOLDER_AGREEMENT_START),
      required: true,
    },
    {
      id: "stripe",
      label: "Connect Stripe to take card payments",
      hint: "Optional, but needed to charge cards and send payment links.",
      href: "/settings?section=stripe",
      done: Boolean(stripe),
      required: false,
    },
  ];

  const required = steps.filter((s) => s.required);
  const requiredDone = required.filter((s) => s.done).length;
  return { steps, requiredDone, requiredTotal: required.length, complete: requiredDone === required.length };
}
